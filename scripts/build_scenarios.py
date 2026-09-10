"""Compile the supplied assessment design; preserve candidate instructions and rubric text."""
import re,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
src=(root/'docs/AIMI_Assessment_Design_Revised.md').read_text()
sections=re.split(r'^## Section \d+ – .*$',src,flags=re.M)[2:]
ids=['consulting','investment-banking','business-operations','product-management']
titles=['Strategy Consultant','Investment Banking Analyst','Business Operations Analyst','Product Manager']
companies=['Vantage Logistics Solutions','Aegis Cyber-Infrastructure','Apex Logistics Tech','Nimbus Home']
shocks=[4,3,3,4];shockex=[7,7,8,9];times=['11:30 AM','12:15 PM','1:15 PM','11:30 AM']
alltracks=[]
def clean(s): return s.strip().strip('*').strip()
def table(body):
 lines=[l for l in body.splitlines() if l.startswith('|')]
 if len(lines)<3:return {}
 keys=[clean(c) for c in lines[0].strip('|').split('|')]
 rows=[dict(zip(keys,[clean(c) for c in l.strip('|').split('|')])) for l in lines[2:] if not re.match(r'^\|[- :|]+$',l)]
 return dict(tableColumns=[dict(key=k,header=k) for k in keys],tableRows=rows)
for ix,(id,section) in enumerate(zip(ids,sections)):
 background=re.search(r'## Company Background\n(.*?)(?=\n## )',section,re.S).group(1).strip()
 matches=list(re.finditer(r'^(?:### |\*\*)Exhibit (\d+): (.*?)(?:\*\*)?$',section,re.M));exhibits=[]
 for i,m in enumerate(matches):
  end=matches[i+1].start() if i+1<len(matches) else section.index('## Scoring Anchor')
  body=section[m.end():end].strip();number=int(m[1]);title=clean(m[2])
  # Only exhibits that explicitly contain an AI-generated output/summary/update
  # are verification targets; ordinary exhibits such as program economics are
  # reference data even when their title contains the acronym "AI".
  isai=bool(re.search(r'\bAI\b.*(?:output|sample|summary|update)',title,re.I));hidden='Hidden Key' in title
  exhibits.append(dict(id=f'{id}-ex{number}',number=number,title=title,subtitle='Revised design · September 2026',type='ai-sample' if isai else 'data',content=body,releaseSegment=shocks[ix] if number>=shockex[ix] else 1,graderOnly=hidden,**table(body),**({'aiSampleText':body} if isai else {})))
 if ix==0:
  exhibits[1]['content']=exhibits[1]['content'].replace('eligible users × weekly active users','weekly active user count')+'\n\nImplementation clarification: the supplied active-user count already reflects adoption. Multiplying by eligible employees again would double-count users.'
 # Rows are authored synthetic examples, not claimed to be supplied source rows.
 if ix==2:
  rows=[]
  for j in range(25):
   hub='A' if j<8 else 'B' if j<17 else 'C';k=j if hub=='A' else j-8 if hub=='B' else j-17
   complexity=5 if k in ([0,1] if hub!='C' else [0,1,2]) else 2+k%2
   rows.append(dict(Order_ID=f'SYN-{j+1:03}',Facility_ID='Hub '+hub,Client_Company_Name=f'Synthetic client {j%5+1}',Enterprise_Tax_ID=f'00-{j+1:07}',Shipping_ZIP_Code='10001' if j%2 else '10002',SKU_Complexity_Score=complexity,Staff_On_Shift=(8+k%2 if hub=='A' else 7+k%2 if hub=='B' else 3+k%2),Processing_Time_Hrs=round((2.7 if hub=='A' else 3.0 if hub=='B' else 3.8)+(complexity-2)*.35,2),Mis_Shipment_Flag=int(hub=='C' and k==0),Operator_Incident_Notes=f'Synthetic shift note {j+1}; internal client contact details withheld.'))
  target=exhibits[2]
  target.update(type='dataset',tableRows=rows,tableColumns=[dict(key=k,header=k) for k in rows[0]],content='25 generated synthetic training records using the source field definitions. These rows are an implementation fixture; facility-level population rates in Exhibit 1 are separate evidence. Do not equate sample error rates or complexity shares with population estimates.\n\n'+target['content'])
 if ix==3:
  rows=[]
  # 8 new linking attempts: 6 fail, 2 succeed; 5 returning skip and activate; 2 other abandonments.
  for j in range(15):
   success=j in [6,7];complete=success or 8<=j<13
   rows.append(dict(User_Type='Subscription beta',New_or_Returning='Returning' if 8<=j<13 else 'New',Account_Linking_Attempted=int(j<8),Account_Linking_Success=int(success),Onboarding_Time_Min=4 if complete else 7 if j<6 else 6,Activation_Completed=int(complete),Support_Ticket=int(j<6),NPS=([8,8,8,8,8,8,9][j-6] if complete else [2,2,3,3,3,3,2,3][j if j<6 else j-7])))
  target=exhibits[5];target.update(type='dataset',tableRows=rows,tableColumns=[dict(key=k,header=k) for k in rows[0]],content='15 generated synthetic beta sessions using the source definitions and counts. NPS is integer-valued; averages round to 2.6 and 8.1. The source describes one copy abandonment; the reason for the other non-linking abandonment is unspecified.\n\n'+target['content'])
 phases=[];deliverables=[]
 phase_matches=list(re.finditer(r'^## (Segment (\d+): .*?|Final Deliverable.*?) \((\d+) min\)$',section,re.M))
 for p,m in enumerate(phase_matches):
  end=re.search(r'\n## ',section[m.end():]);end=m.end()+end.start() if end else len(section)
  body=section[m.end():end].strip();name=re.sub(r'^Segment \d+: ','',m[1]);pid=p+1
  phases.append(dict(id=pid,number=pid,title=name,subtitle=name,durationSeconds=int(m[3])*60,objective=name,focusAreas=[],deliverablesSummary=[name],instructions=body))
  deliverables.append(dict(id=f'{id}-s{pid}',phaseId=pid,stepNumber=pid,title=name,description=body,placeholder='Record your analysis, evidence, decisions, tradeoffs and reflection for this segment.',type='textarea',required=True))
 strong=re.search(r'\*\*Strong response\*\*(.*?)\*\*Weak response\*\*',section,re.S).group(1).strip()
 weak=re.search(r'\*\*Weak response\*\*(.*?)(?=\n## )',section,re.S).group(1).strip()
 additions=re.search(r'## .*Rubric Additions\n(.*)',section,re.S).group(1)
 criteria=[]
 for i,m in enumerate(re.finditer(r'^### (.*?)\n(.*?)(?=\n### |\Z)',additions,re.S|re.M)):
  criteria.append(dict(id=f'criterion-{i+1}',name=m[1],weight=1,maxScore=5,description=m[2].strip(),anchorStrong=m[2].strip()+'\n\nTrack anchor:\n'+strong,anchorMid='Answers the prompt but remains generic, incomplete, or only partially adapted to the constraint. (Universal mid anchor; no track-specific mid example supplied.)',anchorWeak=weak))
 # Universal criteria where additions omit them.
 for name in ['Verification Discipline','Data Hygiene & Privacy']:
  if not any(c['name']==name for c in criteria):criteria.append(dict(id=f'criterion-{len(criteria)+1}',name=name,weight=1,maxScore=5,description=name,anchorStrong='Uses verification discipline and handles sensitive data safely.\n'+strong,anchorMid='Directionally correct but generic or incomplete.',anchorWeak=weak))
 for c in criteria:c['weight']=100/len(criteria)
 fields=[]
 if ix==2:
  for row in table(exhibits[2]['content'])['tableRows']:
   name=row['Field'];a=row['Permitted AI Handling'].lower().replace('use as-is','use-as-is').split(' / ')
   fields.append(dict(fieldName=name,description=row['Description'],sensitivityLevel='PII / Financial' if name=='Enterprise_Tax_ID' else 'Unstructured / Sensitive' if name=='Operator_Incident_Notes' else 'PII / Proprietary' if name=='Client_Company_Name' else 'Quasi-ID' if name=='Shipping_ZIP_Code' else 'Operational Metric',expectedAction=a,ruleRationale=row['Permitted AI Handling']))
 else:
  safes=(['Function','Eligible Employees','Weekly Active AI Users','Weekly Active Usage','Avg. Weekly Hours Saved / Active User','Estimated Fully Loaded Labor Cost / Hour'] if ix==0 else ['Revenue','EBITDA','D&A','CapEx','Change_in_NWC','Tax_Rate','WACC','Terminal_Growth','Cash','Debt'] if ix==1 else list(exhibits[5]['tableRows'][0]))
  for name in safes:fields.append(dict(fieldName=name,description='Scenario metric; use only the supplied anonymized or aggregate value.',sensitivityLevel='Operational Metric',expectedAction=['use-as-is','exclude'],ruleRationale='Safe metric; minimize scope.'))
  for name in (['Client_Company_Name','Client_Contact','Internal_Notes'] if ix!=3 else ['User_Email','User_Name','Free_Text_Feedback']):fields.append(dict(fieldName=name,description='Potential sensitive data; not necessary for the case analysis.',sensitivityLevel='Unstructured / Sensitive',expectedAction=['redact','exclude'],ruleRationale='Do not send identifying or free-text customer data.'))
 shock=exhibits[shockex[ix]-1]
 emergency=dict(title=shock['title'],headline=shock['title'],indicators=[],memoRecipient=titles[ix],memoTimestamp=times[ix],memoPoints=[shock['content']],adaptationRequirement='Reassess what changes, what remains valid, why, and what evidence would change your decision.',mandatoryRevisions=['Record changed and unchanged conclusions, two monitored KPIs with thresholds, and the assumption revised after the update.'])
 msg=dict(id='mid_scenario_constraint',senderName='Scenario wire',senderRole='Operations / diligence',senderAvatar='',senderInitials='SW',subject=shock['title'],timestamp=times[ix],isEmergency=True,unread=True,content=[shock['content']])
 nodes=[dict(id=f'node-{p+1}',phaseId=p+1,category=['DIAGNOSE','ANALYZE','DECIDE','PILOT','PILOT'][p],title=phase['title'],context='',purpose='',tradeoffs='',isComplete=False,position=dict(x=20+min(p,3)*270,y=40+(p%2)*120+(120 if p==4 else 0)),connectsTo=[f'node-{p+2}'] if p<len(phases)-1 else []) for p,phase in enumerate(phases)]
 alltracks.append(dict(id=id,title=titles[ix],roleTitle=titles[ix],companyName=companies[ix],companyBackground=background,activeObjective=phases[0]['title'],designVersion=2,shockSegment=shocks[ix],exhibits=exhibits,phases=phases,branchingDecisions=[],roadmapNodes=nodes,reflectionPrompt='What remains uncertain, and what would change your decision?',peerReview=dict(peerName='Scenario AI',peerRole='Unverified draft',scenarioContext='',aiDraftText='',requiredChecks=[]),dataGate=dict(title='Data hygiene review',description='Choose and justify handling for every field before AI use. Sensitive data must be removed; all decisions and blocked attempts are recorded.',fields=fields),emergencyConstraint=emergency,deliverables=deliverables,rubric=criteria,inboxMessages=[dict(id='stakeholder-brief',senderName='Leadership team',senderRole='Stakeholder perspectives',senderAvatar='',senderInitials='LT',subject='Decision context and constraints',timestamp='09:00 AM',unread=True,content=[exhibits[3 if ix in [0,3] else 1]['content']]),msg],artifactRequirements=dict(visualSegment=2,minVisuals=0 if ix==1 else 2,draftDeckSegment=3 if ix==0 else None,finalDeckPages=[4,5] if ix in [0,1] else None,finalMemoPages=[1,1] if ix==1 else [2,2] if ix==2 else [1,2] if ix==3 else None,finalDashboard=ix in [2,3]),verificationSegments=[1,2,shocks[ix]],minimumInitialClaims=3 if ix==0 else 1))
(root/'server/scenarios/revised.json').write_text(json.dumps(alltracks,indent=2))
for id,name in zip(ids,['consultingTrack','investmentBankingTrack','businessOperationsTrack','productManagementTrack']):
 (root/f'src/data/tracks/{id}.ts').write_text(f"// Server/seed entry only: never import scenario solutions into applicant UI.\nimport tracks from '../../../server/scenarios/revised.json';\nimport type {{ TrackConfig }} from '../../types';\nexport const {name} = tracks.find(t => t.id === '{id}') as unknown as TrackConfig;\n")
print([(t['id'],[p['durationSeconds']//60 for p in t['phases']],len(t['exhibits'])) for t in alltracks])
