REPORTS = {
    'pedido': {
        'verbose': 'Pedidos de Venda',
        'table': 'sales',
        'default_columns': ['id','data_pedido','cliente.nome','valor_total'],
        'fields': {
            'id': {'label': 'Número do Pedido', 'path': 'id', 'type': 'int'},
            'data_pedido': {'label': 'Data do Pedido', 'path': 'data_pedido', 'type': 'date'},
            'valor_total': {'label': 'Valor Total do Pedido', 'path': 'valor_total', 'type': 'currency'},
            'cliente.nome': {'label': 'Nome do Cliente', 'path': 'cliente.nome', 'type': 'string', 'join': ['cliente']},
            'cliente.endereco.cidade': {'label': 'Cidade do Cliente', 'path': 'cliente.endereco.cidade', 'type': 'string', 'join': ['cliente','endereco']}
        },
        'filters': {
            'data_range': {'field': 'data_pedido', 'lookup': 'between', 'type': 'date'},
            'status': {'field': 'status', 'lookup': 'exact', 'type': 'enum'},
            'valor_min': {'field': 'valor_total', 'lookup': 'gte', 'type': 'currency'}
        },
        'groupings': {
            'cliente': {'path': 'cliente.nome', 'label': 'Por Cliente'},
            'mes': {'path': 'data_pedido', 'label': 'Por Mês', 'transform':'date_trunc_month'}
        }
    }

    ,
    'produto': {
        'verbose': 'Produtos',
        'table': 'products',
        'default_columns': ['id','sku','name','category','stock','price','cost'],
        'fields': {
            'id': {'label': 'ID do Produto', 'path': 'id', 'type': 'int'},
            'sku': {'label': 'SKU', 'path': 'sku', 'type': 'string'},
            'name': {'label': 'Nome', 'path': 'name', 'type': 'string'},
            'category': {'label': 'Categoria', 'path': 'category', 'type': 'string'},
            'stock': {'label': 'Estoque', 'path': 'stock', 'type': 'int'},
            'price': {'label': 'Preço de Venda', 'path': 'price', 'type': 'currency'},
            'cost': {'label': 'Custo', 'path': 'cost', 'type': 'currency'}
        },
        'filters': {
            'category': {'field': 'category', 'lookup': 'exact', 'type': 'string'},
            'stock_lt': {'field': 'stock', 'lookup': 'lt', 'type': 'int'}
        },
        'groupings': {
            'category': {'path': 'category', 'label': 'Por Categoria'}
        },
        # Templates / curated reports with KPIs and parameters.
        'templates': [
            {
                'id': 'abc_curve',
                'label': 'Curva ABC (por receita)',
                'description': 'Classifica produtos por contribuição à receita total. Útil para priorizar estoque e compras.',
                'params': [
                    {'name': 'from_date', 'label': 'Data inicial', 'type': 'date'},
                    {'name': 'to_date', 'label': 'Data final', 'type': 'date'},
                    {'name': 'top_n', 'label': 'Top N produtos', 'type': 'int', 'default': 100}
                ],
                'kpis': [
                    {'id': 'revenue_share', 'label': 'Participação na Receita (%)'},
                    {'id': 'cumulative_share', 'label': 'Participação Acumulada (%)'}
                ],
                'executor': 'abc_curve'
            },
            {
                'id': 'cmv',
                'label': 'CMV (Custo da Mercadoria Vendida)',
                'description': 'Calcula CMV por produto ou categoria no período selecionado.',
                'params': [
                    {'name': 'from_date', 'label': 'Data inicial', 'type': 'date'},
                    {'name': 'to_date', 'label': 'Data final', 'type': 'date'}
                ],
                'kpis': [
                    {'id': 'total_cost', 'label': 'Custo Total'},
                    {'id': 'sold_quantity', 'label': 'Quantidade Vendida'}
                ],
                'executor': 'cmv'
            },
            {
                'id': 'contribution_margin',
                'label': 'Margem de Contribuição',
                'description': 'Margem de contribuição por produto (Preço - Custo) e % sobre receita.',
                'params': [
                    {'name': 'from_date', 'label': 'Data inicial', 'type': 'date'},
                    {'name': 'to_date', 'label': 'Data final', 'type': 'date'}
                ],
                'kpis': [
                    {'id': 'margin_value', 'label': 'Margem (R$)'},
                    {'id': 'margin_percent', 'label': 'Margem (%)'}
                ],
                'executor': 'contribution_margin'
            }
        ]
    }
}
