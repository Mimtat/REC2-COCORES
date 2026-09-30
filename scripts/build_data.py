"""Build map data from REC2_example_data.xlsx. Emails are excluded by default.
Usage: python scripts/build_data.py INPUT.xlsx OUTPUT.json [--include-internal-email]
"""
import json, sys
from datetime import date, datetime
from pathlib import Path
from openpyxl import load_workbook

PALETTE=['#A5C711','#BD9D46','#9A9E7F','#25B7B9','#2994A5','#149559']
def clean(v):
    if isinstance(v,datetime): return v.date().isoformat()
    if isinstance(v,date): return v.isoformat()
    return v.strip() if isinstance(v,str) else v

def read(book,sheet,key):
    rows=list(book[sheet].iter_rows(values_only=True))
    header=next((i for i,r in enumerate(rows) if r and r[0]==key),None)
    if header is None: raise ValueError(f'{sheet}: cannot find header {key}')
    names=rows[header]; result=[]
    for i,values in enumerate(rows[header+1:],header+2):
        if not any(v not in (None,'') for v in values): continue
        row={k:clean(v) for k,v in zip(names,values) if k}
        if not row.get(key): raise ValueError(f'{sheet} row {i}: missing {key}')
        for k,v in row.items():
            if k.endswith('_date') and v:
                try: row[k]=date.fromisoformat(str(v)).isoformat()
                except ValueError: raise ValueError(f'{sheet} row {i}: invalid {k}')
        for prefix in ('','collaboration_'):
            a,b=row.get(prefix+'start_date'),row.get(prefix+'end_date')
            if a and b and b<=a: raise ValueError(f'{sheet} row {i}: end must follow start')
        result.append(row)
    return result

def split(v): return [x.strip() for x in str(v or '').split(';') if x.strip()]
def build(source,target,emails=False):
    book=load_workbook(source,read_only=True,data_only=True)
    specs={'themes':('Themes','theme_id'),'cases':('Cases','case_id'),'teams':('Teams','team_id'),'people':('Members','person_id'),'publications':('Publications','publication_id'),'keywords':('Keywords','keyword_id')}
    data={k:read(book,*s) for k,s in specs.items()}; known={}
    for k,(_,key) in specs.items():
        ids=[x[key] for x in data[k]]
        if len(ids)!=len(set(ids)): raise ValueError(f'Duplicate {key}')
        known[key]=set(ids)
    def check(key,value):
        if value not in known[key]: raise ValueError(f'Unknown {key}: {value}')
    links={k:[] for k in ['themeCase','teamCase','teamTheme','personCase','personTheme','publicationAuthor','publicationKeyword','publicationCase','publicationTheme']}
    for i,t in enumerate(data['themes']):
        t.update(RAP='ORAP6' if t['theme_id']=='R06' else 'RAP'+str(int(t['theme_id'][1:])),color_hex=PALETTE[i%6])
    for c in data['cases']:
        for tid in split(c.get('theme_ids')):
            check('theme_id',tid);links['themeCase'].append({'theme_id':tid,'case_id':c['case_id']})
    teams={t['team_id']:t for t in data['teams']}
    for p in data['people']:
        check('team_id',p.get('team_id'));t=teams[p['team_id']]
        p['institution']=t.get('institution');p['discipline']=t.get('discipline')
        if not emails:p['email']=None
    stages=read(book,'Collaboration stages','team_id')
    for s in stages:
        check('team_id',s['team_id']);check('case_id',s.get('case_id'))
        if not s.get('start_date') or not s.get('state'):raise ValueError('Collaboration stages require start_date and state')
        links['teamCase'].append(s.copy())
        for tid in split(next(c for c in data['cases'] if c['case_id']==s['case_id']).get('theme_ids')):
            links['teamTheme'].append({'team_id':s['team_id'],'theme_id':tid,'start_date':s.get('start_date'),'end_date':s.get('end_date')})
        # Team involvement is inherited for navigation, not evidence of individual authorship.
        for p in data['people']:
            if p['team_id']==s['team_id']:links['personCase'].append({'person_id':p['person_id'],'case_id':s['case_id'],'start_date':s.get('start_date'),'end_date':s.get('end_date'),'basis':'team involvement'})
    for p in data['publications']:
        pid=p['publication_id'];check('case_id',p.get('case_id'))
        authors=split(p.get('author_ids'))
        if not authors:raise ValueError(f'{pid}: at least one author required')
        if not p.get('publication_year'):raise ValueError(f'{pid}: publication_year required')
        for order,a in enumerate(authors,1):
            check('person_id',a);links['publicationAuthor'].append({'publication_id':pid,'person_id':a,'author_order':order})
        for k in split(p.get('keyword_ids')):
            check('keyword_id',k);links['publicationKeyword'].append({'publication_id':pid,'keyword_id':k})
        links['publicationCase'].append({'publication_id':pid,'case_id':p['case_id']})
        p['year']=int(p['publication_year']);p['first_visible_date']=p.get('collaboration_start_date')
    data.update(links=links,collaborationStages=stages,publicationStatus=[],schemaVersion=1)
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Built {target}: {len(data["teams"])} teams, {len(data["people"])} members, {len(stages)} stage records')
if __name__=='__main__':
    if len(sys.argv) not in (3,4):raise SystemExit(__doc__)
    if len(sys.argv)==4 and sys.argv[3]!='--include-internal-email':raise SystemExit(__doc__)
    build(Path(sys.argv[1]),Path(sys.argv[2]),len(sys.argv)==4)
