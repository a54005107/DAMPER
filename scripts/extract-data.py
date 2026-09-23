import json,re,ast,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
s=json.loads((root/'design/workbook-analysis.json').read_text(encoding='utf-8'))[-2]; c=s['cells']
def val(k): return c.get(k,{}).get('v') or 0
models=[]
for col,qty,group,rows in [('G','H','SCR-LP',range(4,40)),('I','J','ICER',range(6,10))]:
 for r in rows: models.append({'id':f'{qty}{r}','name':str(val(f'{col}{r}')),'group':group})
def calc(f,inputs):
 def cell(m):
  k=m.group(); v=inputs.get(k, val(k) if not k.startswith(('H','J','P','R')) else 0); return str(v if isinstance(v,(int,float)) else 0)
 f=re.sub(r'([A-Z]+)(\d+):\1(\d+)',lambda m:','.join(m[1]+str(r) for r in range(int(m[2]),int(m[3])+1)),f)
 f=re.sub(r'\b[A-Z]+\d+\b',cell,f).replace('SUM','sum')
 def walk(n):
  if isinstance(n,ast.Constant) and isinstance(n.value,(int,float)):return n.value
  if isinstance(n,ast.BinOp):
   a,b=walk(n.left),walk(n.right)
   if isinstance(n.op,ast.Add):return a+b
   if isinstance(n.op,ast.Sub):return a-b
   if isinstance(n.op,ast.Mult):return a*b
   if isinstance(n.op,ast.Div):return a/b
  if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=='sum':return sum(walk(x) for x in n.args)
  raise ValueError(f)
 return walk(ast.parse(f,mode='eval').body)
materials=[]; issues=[]
for r in range(43,325):
 gf=c.get(f'G{r}',{}).get('f') or '0'; pf=c.get(f'M{r}',{}).get('f') or '0'
 bom=[]; diffs=[]; review_models=[]
 for m in models:
  k=m['id']; p=k.replace('H','P').replace('J','R')
  g=calc(gf,{k:1}); q=calc(pf,{p:1})
  if q:bom.append({'modelId':k,'rate':q})
  if abs(g-q)>1e-9:
   diffs.append(f"{m['name']}: 사용 {g:g}, 계획 {q:g}")
   review_models.append(k)
 if diffs:issues.append(f"- G{r} / M{r} ({val('A'+str(r))}): `{gf}` / `{pf}` → "+'; '.join(diffs))
 materials.append({'id':f'R{r}','name':str(val(f'A{r}')),'substance':str(val(f'B{r}')),'spec':str(c.get(f'E{r}',{}).get('v') or '미기재'),'unit':'개','opening':val(f'J{r}'),'bom':bom,'formula':'q * rate','review':bool(diffs),'source':{'row':r,'usage':gf,'plan':pf,'stock':val(f'J{r}'),'previous':val(f'F{r}'),'loss':val(f'H{r}'),'incoming':val(f'I{r}'),'used':val(f'G{r}')},'modifiedBy':'엑셀 가져오기','modifiedAt':'2026-09-14T00:00:00+09:00'})
 materials[-1]['reviewModels']=sorted(set(review_models+[b['modelId'] for b in bom])) if diffs else []
plans={m['id']:val(m['id'].replace('H','P').replace('J','R')) for m in models}
(root/'client/src/data').mkdir(parents=True,exist_ok=True)
(root/'client/src/data/seed.json').write_text(json.dumps({'materials':materials,'models':models,'plans':{'2026-10':plans}},ensure_ascii=False,indent=2),encoding='utf-8')
report='# 원본 엑셀 분석\n\n파일: DAMPER재고관리(최종).xlsx. 원본은 변경하지 않았습니다.\n\n9개 시트(8개 날짜별 시트 + 빈 Sheet1). 최신 유효 시트 2026.9.14, A42:N324, 자재 282행, SCR-LP 36종 / ICER 4종. 계획월 2026-10, 133대.\n\n## 초기 적용\n\nJ43:J324의 저장된 현재재고를 2026-09-14 종료 스냅샷으로 보존. 웹 거래는 2026-09-15부터 입력. 과거 G/H/I를 다시 차감하지 않습니다. 공용 자재는 한 행을 공유합니다. 모델 연결은 M열 수식의 계수를 추출했습니다. 불일치 행은 검토 대상으로 표시하며 승인 전 자동 사용량 저장을 차단합니다. 계획 필요량은 M열에서 추출한 소요량으로 산출합니다.\n\n## 수식 불일치\n\n'+ '\n'.join(issues)+'\n\n## 누계 및 추가 확인\n\n2026.9.14!L4:L39 및 N6:N9의 수식이 직전 2026.9.11 대신 2026.9.10을 참조합니다. 예: N9의 저장값은 4, 9.11 N9는 6입니다. 생산 누계와 달성률은 가져오지 않습니다. 2026.9.9!L5는 H5 대신 H6을 참조하는 등 행 이동 의심이 있습니다.\n\nG302는 J7*C302 대신 J7*F302(전일재고)를 참조합니다. 위 표에 계수 차이로 포함했습니다. 코드/단위는 원본에 없으므로 R행번호와 개를 사용합니다. 음수 초기 재고는 원본 그대로 보존합니다. 이전 legacy-README의 106행/16모델 데이터는 현재 파일과 다르므로 사용하지 않았습니다.\n'
(root/'design/EXCEL-REVIEW.md').write_text(report,encoding='utf-8')
print(f'{len(materials)} materials, {len(models)} models, {len(issues)} disputed rows')
