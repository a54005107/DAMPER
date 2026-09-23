import zipfile, xml.etree.ElementTree as E, json, pathlib
root=pathlib.Path(__file__).resolve().parents[1]
z=zipfile.ZipFile(next(root.glob('*.xlsx')))
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
strings=[''.join(e.itertext()) for e in E.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns)]
wb=E.fromstring(z.read('xl/workbook.xml'))
result=[]
for i,s in enumerate(wb.find('m:sheets',ns)):
 cells={}
 for c in E.fromstring(z.read(f'xl/worksheets/sheet{i+1}.xml')).findall('.//m:sheetData/m:row/m:c',ns):
  v=c.find('m:v',ns); f=c.find('m:f',ns); val=v.text if v is not None else None
  if c.get('t')=='s' and val is not None: val=strings[int(val)]
  elif val is not None:
   try: val=float(val)
   except ValueError: pass
  if val is not None or f is not None: cells[c.get('r')]={'v':val,'f':f.text if f is not None else None}
 result.append({'name':s.get('name'),'cells':cells})
(root/'design'/'workbook-analysis.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
for s in result:
 print(s['name'],len(s['cells']))
 print(json.dumps({k:v for k,v in s['cells'].items() if int(''.join(filter(str.isdigit,k)))<18},ensure_ascii=False))
print('LAST FORMULAS',json.dumps({k:v for k,v in result[-1]['cells'].items() if k.startswith(('G','F'))},ensure_ascii=False))
