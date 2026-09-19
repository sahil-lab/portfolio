import {resume} from './portfolio';

export function ResumeProjects(){return <section className="resume-projects" aria-label="Projects from supplied résumé"><h2>Projects from my résumé</h2><p>Project descriptions and contributions below come from the supplied résumé. Interactive architecture exhibits await repository details.</p>{resume.projects.map(p=><article key={p.name}><h3>{p.name}</h3><p className="resume-meta">{p.role} · {p.dates}</p><ul>{p.highlights.map(h=><li key={h}>{h}</li>)}</ul></article>)}</section>}

export function ResumeContent({activateSkill}:{activateSkill?:(category:string)=>void}={}){return <article className="resume-record">
 <p className="eyebrow">SYSTEM INFORMATION · SAHIL UPADHYAY</p><h2>{resume.name}</h2><p>{resume.role}</p>
 <div className="resume-links"><a href={resume.source.file} download>Download original résumé (PDF)</a><a href={'mailto:'+resume.email}>{resume.email}</a>{resume.phones.map(p=><a key={p} href={'tel:'+p.replaceAll(' ','')}>{p}</a>)}{resume.links.map(l=><a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}</div>
 <h3>Summary</h3><p>{resume.summary}</p>
 <h3>Experience</h3>{resume.experience.map((e,i)=><details className="resume-role" key={e.name} open={i===0}><summary><strong>{e.name}</strong><span>{e.role}</span><span>{e.dates} · {e.location}</span></summary><ul>{e.highlights.map(h=><li key={h}>{h}</li>)}</ul></details>)}
 <h3>Skills</h3><p>Activate a skill signal to see a matching part of the computer respond. These signals visualize résumé categories; they do not imply a project architecture.</p><dl>{resume.skills.map(s=><div key={s.category}><dt>{s.category}</dt><dd>{s.items}</dd>{activateSkill&&<dd><button className="skill-activate" onClick={()=>activateSkill(s.category)}>Illuminate {s.category} in the world ↗</button></dd>}</div>)}</dl>
 <h3>Education</h3><p><strong>{resume.education.name}</strong> · {resume.education.year}</p><p>{resume.education.degree} · {resume.education.location}</p>
 <h3>Certifications</h3><ul>{resume.certifications.map(c=><li key={c}>{c}</li>)}</ul>
 <ResumeProjects/>
 <h3>Achievements & honors</h3><ul>{resume.achievements.map(a=><li key={a}>{a}</li>)}</ul>
 <h3>Publication topics</h3><p>Topics listed in the résumé; articles are available through the Medium profile above.</p><ul>{resume.publicationTopics.map(p=><li key={p}>{p}</li>)}</ul>
 <p className="resume-source">{resume.source.note}</p>
 </article>}
