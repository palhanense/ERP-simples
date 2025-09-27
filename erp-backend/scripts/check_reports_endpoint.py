import urllib.request, json, sys
url = 'http://127.0.0.1:8000/reports/products?limit=50'
try:
    resp = urllib.request.urlopen(url, timeout=5)
    data = json.load(resp)
    print('OK: received report with', len(data.get('products', [])), 'products')
    print('totals:', data.get('totals'))
    # print first product summary
    if data.get('products'):
        p = data['products'][0]
        print('\nfirst product sample:')
        for k in ('id','name','sku','cost_price','sale_price','stock','margin','total_sold'):
            print(f'  {k}:', p.get(k))
except Exception as e:
    print('ERROR calling', url)
    print(e)
    sys.exit(1)
