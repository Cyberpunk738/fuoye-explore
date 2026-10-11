from pathlib import Path
import json,re,math
root=Path('.')
# Prepare an auditable inventory; appearance is deliberately separate from identity.
rows=[
 ('management','Faculty of Management Sciences',2,'ms/1b77ae9be7b6829b',[5.3163699,7.7754724],'pin-inside',{'floors':2,'wall':'cream','roof':'green','roofForm':'compound','facade':'management','frontBearing':0,'photo':'management-detail','photoDate':'2021-11'}),
 ('science','Faculty of Science',2,'ms/f36a67c7baf5405c',[5.3148961,7.7772951],'pin-inside',{'roof':'grey','roofForm':'compound'}),
 ('education','Faculty of Education',1,'way/951581878',[5.3234104,7.7785628],'adjacent-pin',{'roof':'sand','roofForm':'compound'}),
 ('basic-medical','Faculty of Basic Medical Sciences',3,'ms/a4a5711314210e9e',[5.3100832,7.7766139],'pin-inside',{'roof':'blue','roofForm':'compound'}),
 ('social-sciences','Faculty of Social Sciences',3,'ms/5ad0a4312cd48f1b',[5.3113264,7.7758713],'pin-inside',{'roof':'grey','roofForm':'compound'}),
 ('boys-hostel','Boys’ hostel',3,'ms/f21e378e2871efba',[5.3117696,7.7739748],'pin-inside',{'floors':4,'wall':'ivory','roof':'green','roofForm':'hip','facade':'hostel','frontBearing':0,'photo':'fuoye-boys-hostel-detail','photoDate':'2022-11'}),
 ('old-girls-hostel','Old girls’ hostel',2,'ms/0d54a652d9b95b28',[5.3164588,7.7744572],'pin-inside',{'roof':'grey','roofForm':'compound'}),
 ('phase1-auditorium','Phase 1 Main Auditorium',1,'way/951581888',[5.3220314,7.7799613],'pin-inside',{'floors':1,'height':5.5,'wall':'cream','roof':'green','roofForm':'compound','facade':'hall','photo':'phase1-detail','photoDate':'2022-05','frontBearing':270}),
 # The admin pin is in the courtyard; match the full compound rather than a nearby shed.
 ('central-admin','Central Administration',2,'ms/8d79d312faf8d996',[5.3145162,7.7785465],'compound-match',{'floors':2,'wall':'ivory','roof':'green','roofForm':'compound','facade':'admin','frontBearing':0,'photo':'fuoye-central-administrative-building-detail','photoDate':'2021-10'})
]
raw=[]
for p in (root/'tmp/maps').glob('fuoye-*.json'):
 try:
  data=json.loads(p.read_text(encoding='utf-8'));raw.extend(data.get('places',[]))
 except: pass
queries={'management':'Fuoye management science building','science':'Faculty of science','education':'Fuoye Faculty Of Education','basic-medical':'Faculty of Basic Medical Sciences','social-sciences':'FACULTY OF SOCIAL SCIENCES','boys-hostel':'Fuoye boys hostel','old-girls-hostel':'Old girls hostel'}
places=[]
for id,name,phase,feature,point,match,appearance in rows:
 source=next((r['url'].split('?')[0] for r in raw if r['name']==queries.get(id)),None)
 if not source:
  source='https://www.google.com/maps/search/'+ ('FUOYE+Phase+1+Main+Auditorium' if id=='phase1-auditorium' else 'FUOYE+CENTRAL+ADMINISTRATIVE+BUILDING')
 photo=appearance.pop('photo',None)
 if photo:
  appearance['photoUrl']=json.loads((root/f'tmp/maps/{photo}.json').read_text(encoding='utf-8'))['url']
  appearance['evidence']='Google Maps contributor photo; observed storeys and visible facade only. Photo capture date is not the present condition.'
 else: appearance['evidence']='Roof colour and form read from Google Maps satellite view on 2026-10-10. Heights, openings and entrances estimated.'
 places.append({'id':id,'name':name,'phase':phase,'featureIds':[feature],'position':point,'match':match,'source':source,'checkedOn':'2026-10-10','appearance':appearance})
places[-1]['featureIds'] += ['ms/8e441f4da274c677','ms/268546222d2d761c']
places[-1]['note']='Maps pin falls in a courtyard. Three mapped wings form the administration compound in satellite imagery; small courtyard sheds are excluded.'
# Area of interest follows the western university grounds and the Phase 1 enclosure west of University Road. Not a cadastral boundary.
area=[[5.3089,7.7740],[5.3090,7.7778],[5.3110,7.7794],[5.3120,7.7811],[5.3154,7.7810],[5.3168,7.77925],[5.3201,7.78065],[5.32372,7.7807],[5.32366,7.7792],[5.32325,7.7776],[5.3226,7.77755],[5.3206,7.7773],[5.3176,7.7731],[5.3150,7.7727],[5.3107,7.7727]]
result={'checkedOn':'2026-10-10','map':'https://maps.app.goo.gl/yDcJm6EFjyrKhLUY6','areaOfInterest':area,'scope':'Oye main campus Phases 1, 2 and 3; imagery-guided scene extent, not an official university property boundary. Maps place identity does not certify current occupancy.','places':places,'unresolved':[
 {'name':'New Senate Building','position':[5.3136294,7.7796474],'reason':'Missing from older machine footprints; satellite outline to be added with tracing provenance. Storeys not verified.','source':'https://www.google.com/maps/search/FUOYE+Senate+Building+New'},
 {'name':'New Faculty of Science Auditorium','position':[5.3136376,7.77927],'reason':'Pin is on open ground in the inspected satellite image. Do not mislabel the Senate Building or invent an auditorium footprint.'},
 {'name':'Theatre and Media Arts','position':[5.3163616,7.7767796],'reason':'Pin lies on a small structure beside the larger theatre compound. Main hall and department extent need independent confirmation.'},
 {'name':'University Library','position':[5.328548,7.7978432],'reason':'Maps listing is in Oye town, outside this main-campus scene. Main-campus library identity unresolved.'},
 {'name':'FUOYE ICT Centre','position':[5.342974,7.7991459],'reason':'Maps listing is outside the main-campus scene.'}
 ],'excluded':['Ikole engineering faculty and hostels','Tourism/Aviation Quarters listing sharing the generic university pin','Private hostels and businesses east of University Road'],'limitations':['Satellite acquisition date unavailable; ©2026 is a copyright date.','Reviewed contributor photos date from 2021–2022; not represented as 2026 photographs.','Social Sciences photo appears geotagged in town; not used to reconstruct the Phase 3 facade.']}
(root/'research/oye-campus-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('Saved',len(places),'named places')
