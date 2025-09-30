from django.shortcuts import render
from django.http import JsonResponse, HttpResponseBadRequest
from . import metadata
from django.views.decorators.csrf import csrf_exempt
from .auth_utils import require_auth
import json


def index(request):
    # show a simple page listing the entity types
    entities = [{'key': k, 'label': v['verbose']} for k, v in metadata.REPORTS.items()]
    return render(request, 'reports_app/index.html', {'entities': entities})


@require_auth
def meta_entity(request, entity):
    m = metadata.REPORTS.get(entity)
    if not m:
        return JsonResponse({'error': 'unknown entity'}, status=404)
    return JsonResponse(m)


@csrf_exempt
@require_auth
def execute_report(request):
    # Safe executor: validates JSON, maps to allowed table/columns from metadata,
    # builds a parametrized SELECT and returns up to `max_limit` rows.
    from django.db import connection

    if request.method != 'POST':
        return HttpResponseBadRequest('POST required')
    try:
        body = json.loads(request.body)
    except Exception:
        return HttpResponseBadRequest('invalid json')

    entity = body.get('entity')
    if not entity or entity not in metadata.REPORTS:
        return JsonResponse({'error': 'invalid entity'}, status=400)

    meta = metadata.REPORTS[entity]
    table = meta.get('table')
    if not table:
        return JsonResponse({'error': 'entity has no table mapping'}, status=500)

    # If a curated template is requested, dispatch to template executors
    template_id = body.get('template') or body.get('template_id')
    if template_id:
        # only support templates defined in metadata for this entity
        templates = {t['id']: t for t in meta.get('templates', [])}
        tmpl = templates.get(template_id)
        if not tmpl:
            return JsonResponse({'error': f'unknown template {template_id}'}, status=400)

        # helper: run SQL and return columns/rows
        def run_sql(sql, params):
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SET LOCAL statement_timeout = %s", [30000])
                    cursor.execute(sql, params)
                    cols = [col[0] for col in cursor.description] if cursor.description else []
                    results = [dict(zip(cols, row)) for row in cursor.fetchall()]
                return cols, results
            except Exception as exc:
                return None, str(exc)

        # Parameters normalization
        from_date = body.get('from_date') or body.get('params', {}).get('from_date')
        to_date = body.get('to_date') or body.get('params', {}).get('to_date')
        top_n = int(body.get('top_n') or body.get('params', {}).get('top_n') or 100)

        # template implementations for produto
        if entity == 'produto':
            if template_id == 'abc_curve':
                sql = """
                    SELECT p.id as product_id, p.name as product_name, SUM(si.line_total)::numeric AS revenue, SUM(si.quantity) AS sold_qty
                    FROM sale_items si
                    JOIN products p ON p.id = si.product_id
                    JOIN sales s ON s.id = si.sale_id
                    WHERE (%s IS NULL OR s.created_at::date >= %s) AND (%s IS NULL OR s.created_at::date <= %s)
                    GROUP BY p.id, p.name
                    ORDER BY revenue DESC
                    LIMIT %s
                """
                params = [from_date, from_date, to_date, to_date, top_n]
                cols, rows_or_err = run_sql(sql, params)
                if cols is None:
                    return JsonResponse({'error': 'query failed', 'detail': rows_or_err}, status=500)
                return JsonResponse({'columns': cols, 'rows': rows_or_err})

            if template_id == 'cmv':
                sql = """
                    SELECT p.id as product_id, p.name as product_name, SUM(si.quantity * p.cost_price)::numeric AS total_cost, SUM(si.quantity) AS sold_qty
                    FROM sale_items si
                    JOIN products p ON p.id = si.product_id
                    JOIN sales s ON s.id = si.sale_id
                    WHERE (%s IS NULL OR s.created_at::date >= %s) AND (%s IS NULL OR s.created_at::date <= %s)
                    GROUP BY p.id, p.name
                    ORDER BY total_cost DESC
                    LIMIT %s
                """
                params = [from_date, from_date, to_date, to_date, top_n]
                cols, rows_or_err = run_sql(sql, params)
                if cols is None:
                    return JsonResponse({'error': 'query failed', 'detail': rows_or_err}, status=500)
                return JsonResponse({'columns': cols, 'rows': rows_or_err})

            if template_id == 'contribution_margin':
                sql = """
                    SELECT p.id as product_id, p.name as product_name,
                           SUM(si.line_total)::numeric AS revenue,
                           SUM(si.quantity * p.cost_price)::numeric AS cost,
                           (SUM(si.line_total) - SUM(si.quantity * p.cost_price))::numeric AS margin,
                           CASE WHEN SUM(si.line_total) = 0 THEN 0 ELSE ((SUM(si.line_total) - SUM(si.quantity * p.cost_price)) / NULLIF(SUM(si.line_total),0) * 100) END AS margin_pct
                    FROM sale_items si
                    JOIN products p ON p.id = si.product_id
                    JOIN sales s ON s.id = si.sale_id
                    WHERE (%s IS NULL OR s.created_at::date >= %s) AND (%s IS NULL OR s.created_at::date <= %s)
                    GROUP BY p.id, p.name
                    ORDER BY margin DESC
                    LIMIT %s
                """
                params = [from_date, from_date, to_date, to_date, top_n]
                cols, rows_or_err = run_sql(sql, params)
                if cols is None:
                    return JsonResponse({'error': 'query failed', 'detail': rows_or_err}, status=500)
                return JsonResponse({'columns': cols, 'rows': rows_or_err})

        return JsonResponse({'error': f'template {template_id} not supported for entity {entity}'}, status=400)

    # Requested columns
    requested = body.get('columns') or meta.get('default_columns', [])

    # Validate columns: for MVP only support direct columns (no joins)
    allowed_fields = {}
    for key, info in meta.get('fields', {}).items():
        allowed_fields[key] = info

    # Only allow fields that map to top-level paths (no dots) for now
    select_cols = []
    col_aliases = []
    for col in requested:
        info = allowed_fields.get(col)
        if not info:
            return JsonResponse({'error': f'column not allowed: {col}'}, status=400)
        path = info.get('path')
        if '.' in path:
            return JsonResponse({'error': f'column requires joins which are not supported in MVP: {col}'}, status=400)
        select_cols.append(path)
        col_aliases.append(col)

    # Filters (support a small set defined in metadata)
    filters = body.get('filters') or []
    where_clauses = []
    params = []
    for f in filters:
        fname = f.get('filter') or f.get('field')
        val = f.get('value')
        if not fname or fname not in meta.get('filters', {}):
            return JsonResponse({'error': f'unknown filter: {fname}'}, status=400)
        fmeta = meta['filters'][fname]
        field_name = fmeta['field']
        lookup = fmeta.get('lookup')
        if lookup == 'between':
            if not isinstance(val, (list, tuple)) or len(val) != 2:
                return JsonResponse({'error': f'filter {fname} expects two values (start,end)'}, status=400)
            where_clauses.append(f"{field_name} BETWEEN %s AND %s")
            params.extend([val[0], val[1]])
        elif lookup == 'exact':
            where_clauses.append(f"{field_name} = %s")
            params.append(val)
        elif lookup == 'gte':
            where_clauses.append(f"{field_name} >= %s")
            params.append(val)
        else:
            return JsonResponse({'error': f'unsupported lookup {lookup} for filter {fname}'}, status=400)

    # Limit
    max_limit = 5000
    req_limit = body.get('limit') or 500
    try:
        limit = int(req_limit)
    except Exception:
        limit = 500
    if limit <= 0 or limit > max_limit:
        return JsonResponse({'error': f'limit must be between 1 and {max_limit}'}, status=400)

    # Order by (optional)
    order_by = ''
    if body.get('order_by'):
        ob = body['order_by'][0]
        ob_col = ob.get('column')
        ob_dir = ob.get('dir', 'asc').lower()
        if ob_col not in col_aliases:
            return JsonResponse({'error': f'order_by column not in selected columns: {ob_col}'}, status=400)
        if ob_dir not in ('asc', 'desc'):
            ob_dir = 'asc'
        # map alias to actual path
        idx = col_aliases.index(ob_col)
        order_by = f"ORDER BY {select_cols[idx]} {ob_dir.upper()}"

    # Build SQL
    select_expr = ', '.join([f"{table}.{c} AS {c}" for c in select_cols])
    sql = f"SELECT {select_expr} FROM {table}"
    if where_clauses:
        sql += " WHERE " + " AND ".join(where_clauses)
    if order_by:
        sql += ' ' + order_by
    sql += f" LIMIT {limit}"

    # Execute with statement timeout to avoid long running queries
    try:
        with connection.cursor() as cursor:
            # set statement_timeout in ms (30s)
            cursor.execute("SET LOCAL statement_timeout = %s", [30000])
            cursor.execute(sql, params)
            cols = [col[0] for col in cursor.description] if cursor.description else []
            results = [dict(zip(cols, row)) for row in cursor.fetchall()]
    except Exception as exc:
        return JsonResponse({'error': 'query failed', 'detail': str(exc)}, status=500)

    # Map column names back to aliases requested by client
    # results dict keys are actual column names; we'll return alias keys
    mapped_rows = []
    for r in results:
        mapped = {}
        for alias, path in zip(col_aliases, select_cols):
            mapped[alias] = r.get(path)
        mapped_rows.append(mapped)

    return JsonResponse({'columns': col_aliases, 'rows': mapped_rows})
