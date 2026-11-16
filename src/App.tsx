import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, Buildings, CalendarBlank, Camera, CaretDown, CaretRight, Check,
  CheckCircle, CloudSun, DownloadSimple, FileText, FolderOpen, GearSix, HardHat,
  HouseLine, ImageSquare, MagnifyingGlass, MapPin, Plus, Sparkle, Sun, Trash,
  TrendUp, Users, Warning, X,
} from '@phosphor-icons/react'
import './App.css'

type View = 'visao' | 'obras' | 'diario'
type ProjectStatus = 'Em andamento' | 'Planejamento' | 'Pausada'
type Project = { id: string; name: string; address: string; client: string; status: ProjectStatus; progress: number; color: string; updatedAt: string }
type Report = { id: string; projectId: string; date: string; period: 'Integral' | 'Manhã' | 'Tarde'; weather: 'Ensolarado' | 'Nublado' | 'Chuva'; workers: number; activities: string; occurrences: string; photoIds: string[]; createdAt: string }

const STORAGE_KEY = 'obbra.prototype.v1'
const DB_NAME = 'obbra-media'
const TODAY = new Date()
const TODAY_ISO = TODAY.toISOString().slice(0, 10)
const TODAY_LABEL = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(TODAY)
const initialProjects: Project[] = [
  { id: 'residencia-vila-nova', name: 'Residência Vila Nova', address: 'Al. dos Ipês, 184 · Goiânia, GO', client: 'Marina e Rafael', status: 'Em andamento', progress: 68, color: '#d76a2d', updatedAt: new Date().toISOString() },
  { id: 'edificio-comercial-orion', name: 'Edifício Comercial Órion', address: 'Av. T-10, 920 · Goiânia, GO', client: 'Grupo Órion', status: 'Em andamento', progress: 42, color: '#1d6b58', updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'reforma-casa-boa-vista', name: 'Reforma Casa Boa Vista', address: 'R. 12, 55 · Aparecida de Goiânia, GO', client: 'Carlos Mendonça', status: 'Planejamento', progress: 12, color: '#3f5f8f', updatedAt: new Date(Date.now() - 172800000).toISOString() },
]
const initialReports: Report[] = [
  { id: 'report-seed-1', projectId: 'residencia-vila-nova', date: new Date().toISOString().slice(0, 10), period: 'Integral', weather: 'Ensolarado', workers: 8, activities: 'Finalização do reboco externo e início da instalação dos pontos elétricos do pavimento superior.', occurrences: 'Entrega dos revestimentos confirmada para amanhã às 09h.', photoIds: [], createdAt: new Date().toISOString() },
  { id: 'report-seed-2', projectId: 'edificio-comercial-orion', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), period: 'Integral', weather: 'Nublado', workers: 14, activities: 'Montagem das formas dos pilares do terceiro pavimento e conferência de prumo.', occurrences: '', photoIds: [], createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'report-seed-3', projectId: 'residencia-vila-nova', date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), period: 'Tarde', weather: 'Chuva', workers: 6, activities: 'Execução de infraestrutura hidráulica nos banheiros e teste de estanqueidade.', occurrences: 'Chuva forte interrompeu os serviços externos após as 15h.', photoIds: [], createdAt: new Date(Date.now() - 172800000).toISOString() },
]
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`))

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('photos')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function savePhoto(file: File) {
  const id = uid('photo'); const db = await openMediaDb()
  await new Promise<void>((resolve, reject) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put(file, id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) })
  db.close(); return id
}
async function readPhoto(id: string): Promise<Blob | undefined> {
  const db = await openMediaDb()
  return new Promise((resolve, reject) => { const request = db.transaction('photos', 'readonly').objectStore('photos').get(id); request.onsuccess = () => { resolve(request.result); db.close() }; request.onerror = () => reject(request.error) })
}
function PhotoThumb({ id, alt }: { id: string; alt: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => { let objectUrl = ''; readPhoto(id).then((blob) => { if (blob) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) } }); return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) } }, [id])
  return url ? <img src={url} alt={alt} /> : <span><ImageSquare size={22} /></span>
}

function App() {
  const stored = useMemo(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as { projects: Project[]; reports: Report[] } | null } catch { return null } }, [])
  const [projects, setProjects] = useState<Project[]>(stored?.projects || initialProjects)
  const [reports, setReports] = useState<Report[]>(stored?.reports || initialReports)
  const [view, setView] = useState<View>('visao')
  const [reportModal, setReportModal] = useState(false)
  const [projectModal, setProjectModal] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, reports })) }, [projects, reports])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3000); return () => window.clearTimeout(timer) }, [toast])
  const activeProjects = projects.filter((project) => project.status === 'Em andamento')
  const filteredProjects = projects.filter((project) => `${project.name} ${project.client} ${project.address}`.toLowerCase().includes(search.toLowerCase()))
  const filteredReports = reports.filter((report) => { const project = projects.find((item) => item.id === report.projectId); return `${project?.name} ${report.activities} ${report.occurrences}`.toLowerCase().includes(search.toLowerCase()) })
  function exportData() { const blob = new Blob([JSON.stringify({ projects, reports }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `obbra-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); setToast('Backup exportado com sucesso') }
  function openView(next: View) { setView(next); setSearch('') }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => openView('visao')} aria-label="Ir para visão geral"><span className="brand-mark"><Buildings weight="duotone" size={22} /></span><span><strong>obbra</strong><small>diário de obras</small></span></button>
        <nav className="side-nav" aria-label="Navegação principal">
          <button className={view === 'visao' ? 'active' : ''} onClick={() => openView('visao')}><HouseLine size={20} /><span>Visão geral</span></button>
          <button className={view === 'obras' ? 'active' : ''} onClick={() => openView('obras')}><HardHat size={20} /><span>Obras</span><em>{projects.length}</em></button>
          <button className={view === 'diario' ? 'active' : ''} onClick={() => openView('diario')}><FileText size={20} /><span>Diário</span><em>{reports.length}</em></button>
        </nav>
        <div className="side-section"><p>Obras recentes</p>{projects.slice(0, 3).map((project) => <button key={project.id} onClick={() => openView('obras')} className="recent-project"><i style={{ background: project.color }} /><span>{project.name}</span></button>)}</div>
        <div className="sidebar-spacer" />
        <button className="backup-card" onClick={exportData}><span><DownloadSimple size={18} /></span><div><strong>Dados protegidos</strong><small>Exportar backup local</small></div><CaretRight size={16} /></button>
        <button className="side-settings"><GearSix size={19} /> Configurações</button>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => openView('visao')}><span className="brand-mark"><Buildings weight="duotone" size={20} /></span><strong>obbra</strong></button>
          <label className="search-field"><MagnifyingGlass size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar obra ou registro..." /><kbd>⌘ K</kbd></label>
          <button className="new-report-button" onClick={() => setReportModal(true)}><Plus size={19} weight="bold" /><span>Novo diário</span></button>
        </header>
        {view === 'visao' && <Dashboard projects={projects} reports={reports} activeProjects={activeProjects} onNewReport={() => setReportModal(true)} onOpenProjects={() => openView('obras')} onOpenReports={() => openView('diario')} />}
        {view === 'obras' && <ProjectsView projects={filteredProjects} reports={reports} onCreate={() => setProjectModal(true)} />}
        {view === 'diario' && <ReportsView reports={filteredReports} projects={projects} onCreate={() => setReportModal(true)} onExport={exportData} />}
      </main>
      <nav className="bottom-nav" aria-label="Navegação móvel">
        <button className={view === 'visao' ? 'active' : ''} onClick={() => openView('visao')}><HouseLine size={21} /><span>Início</span></button>
        <button className={view === 'obras' ? 'active' : ''} onClick={() => openView('obras')}><HardHat size={21} /><span>Obras</span></button>
        <button className="bottom-add" onClick={() => setReportModal(true)}><Plus size={25} weight="bold" /></button>
        <button className={view === 'diario' ? 'active' : ''} onClick={() => openView('diario')}><FileText size={21} /><span>Diário</span></button>
        <button onClick={exportData}><GearSix size={21} /><span>Mais</span></button>
      </nav>
      {reportModal && <ReportDialog projects={projects} onClose={() => setReportModal(false)} onSave={(report) => { setReports((current) => [report, ...current]); setProjects((current) => current.map((project) => project.id === report.projectId ? { ...project, updatedAt: report.createdAt } : project)); setReportModal(false); setToast('Diário salvo com sucesso') }} />}
      {projectModal && <ProjectDialog onClose={() => setProjectModal(false)} onSave={(project) => { setProjects((current) => [project, ...current]); setProjectModal(false); setToast('Obra criada com sucesso') }} />}
      {toast && <div className="toast"><CheckCircle size={20} weight="fill" />{toast}</div>}
    </div>
  )
}

function Dashboard({ projects, reports, activeProjects, onNewReport, onOpenProjects, onOpenReports }: { projects: Project[]; reports: Report[]; activeProjects: Project[]; onNewReport: () => void; onOpenProjects: () => void; onOpenReports: () => void }) {
  return <div className="page dashboard-page">
    <section className="welcome-row"><div><span className="eyebrow"><Sparkle size={13} weight="fill" />Painel de campo</span><h1>Bom dia, Leonardo.</h1><p>{TODAY_LABEL.charAt(0).toUpperCase() + TODAY_LABEL.slice(1)}. Acompanhe o que está acontecendo nas suas obras.</p></div><button className="outline-action" onClick={onOpenReports}><CalendarBlank size={18} />Ver todos os registros</button></section>
    <section className="metrics-grid"><Metric icon={<HardHat size={21} />} color="orange" label="Obras ativas" value={String(activeProjects.length)} note={`${projects.length} no total`} /><Metric icon={<FileText size={21} />} color="green" label="Registros" value={String(reports.length)} note="diários salvos" /><Metric icon={<Camera size={21} />} color="blue" label="Fotos" value={String(reports.reduce((t, r) => t + r.photoIds.length, 0))} note="memória visual" /><Metric icon={<Warning size={21} />} color="amber" label="Atenção" value={String(reports.filter((r) => r.occurrences).length)} note="ocorrências" /></section>
    <section className="focus-grid">
      <div className="panel projects-panel"><div className="panel-heading"><div><span>Agora</span><h2>Obras em andamento</h2></div><button onClick={onOpenProjects}>Ver todas <ArrowRight size={16} /></button></div><div className="project-list">{activeProjects.map((project) => <article className="project-row" key={project.id}><div className="project-visual" style={{ '--project-color': project.color } as React.CSSProperties}><Buildings size={24} weight="duotone" /></div><div className="project-info"><div className="project-title-line"><h3>{project.name}</h3><span>{project.progress}%</span></div><p><MapPin size={14} />{project.address}</p><div className="progress-track"><i style={{ width: `${project.progress}%`, background: project.color }} /></div></div><button aria-label={`Abrir ${project.name}`}><CaretRight size={18} /></button></article>)}</div></div>
      <aside className="quick-panel"><span className="quick-icon"><FileText size={25} weight="duotone" /></span><div><small>Registro de hoje</small><h2>Como foi o dia na obra?</h2><p>Documente equipe, clima, atividades e fotos enquanto tudo está fresco.</p></div><button onClick={onNewReport}>Criar diário <span><ArrowRight size={17} /></span></button></aside>
    </section>
    <section className="panel activity-panel"><div className="panel-heading"><div><span>Histórico</span><h2>Atividade recente</h2></div><button onClick={onOpenReports}>Abrir diário <ArrowRight size={16} /></button></div><div className="activity-list">{reports.slice(0, 4).map((report) => { const project = projects.find((item) => item.id === report.projectId); return <article key={report.id}><span className="activity-marker"><Check size={14} weight="bold" /></span><div><h3>{project?.name}</h3><p>{report.activities}</p></div><time>{formatDate(report.date)}</time></article> })}</div></section>
  </div>
}
function Metric({ icon, color, label, value, note }: { icon: React.ReactNode; color: string; label: string; value: string; note: string }) { return <article className="metric-card"><span className={`metric-icon ${color}`}>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div><TrendUp className="metric-trend" size={18} /></article> }

function ProjectsView({ projects, reports, onCreate }: { projects: Project[]; reports: Report[]; onCreate: () => void }) {
  return <div className="page list-page"><section className="page-title-row"><div><span className="eyebrow">Portfólio em campo</span><h1>Suas obras</h1><p>Acompanhe avanço, equipe e documentação de cada projeto.</p></div><button className="primary-action" onClick={onCreate}><Plus size={18} weight="bold" />Nova obra</button></section>{projects.length ? <section className="project-cards">{projects.map((project) => { const projectReports = reports.filter((report) => report.projectId === project.id); return <article className="project-card" key={project.id}><div className="project-card-cover" style={{ '--project-color': project.color } as React.CSSProperties}><Buildings size={45} weight="duotone" /><span>{project.status}</span></div><div className="project-card-content"><small>{project.client}</small><h2>{project.name}</h2><p><MapPin size={15} />{project.address}</p><div className="project-card-stats"><span><FileText size={17} />{projectReports.length} diários</span><span><Users size={17} />Equipe ativa</span></div><div className="progress-label"><span>Progresso da obra</span><strong>{project.progress}%</strong></div><div className="progress-track"><i style={{ width: `${project.progress}%`, background: project.color }} /></div><button>Ver detalhes <ArrowRight size={16} /></button></div></article> })}</section> : <EmptyState title="Nenhuma obra encontrada" text="Tente outro termo ou cadastre uma nova obra." onClick={onCreate} />}</div>
}
function ReportsView({ reports, projects, onCreate, onExport }: { reports: Report[]; projects: Project[]; onCreate: () => void; onExport: () => void }) {
  return <div className="page list-page"><section className="page-title-row"><div><span className="eyebrow">Memória da execução</span><h1>Diário de obras</h1><p>Registros organizados, claros e fáceis de consultar.</p></div><div className="title-actions"><button className="outline-action" onClick={onExport}><DownloadSimple size={18} />Exportar</button><button className="primary-action" onClick={onCreate}><Plus size={18} weight="bold" />Novo diário</button></div></section>{reports.length ? <section className="reports-list">{reports.map((report) => { const project = projects.find((item) => item.id === report.projectId); return <article className="report-card" key={report.id}><div className="report-date"><strong>{new Date(`${report.date}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${report.date}T12:00:00`)).replace('.', '')}</span></div><div className="report-main"><div className="report-header"><div><span style={{ background: project?.color }} /><small>{project?.name}</small><h2>{report.activities}</h2></div><button aria-label="Abrir registro"><CaretRight size={19} /></button></div><div className="report-meta"><span><CloudSun size={17} />{report.weather}</span><span><Users size={17} />{report.workers} pessoas</span><span><CalendarBlank size={17} />{report.period}</span><span><Camera size={17} />{report.photoIds.length} fotos</span></div>{report.occurrences && <p className="occurrence"><Warning size={17} />{report.occurrences}</p>}{report.photoIds.length > 0 && <div className="photo-strip">{report.photoIds.slice(0, 5).map((id) => <PhotoThumb id={id} alt="Foto do diário" key={id} />)}</div>}</div></article> })}</section> : <EmptyState title="Nenhum diário encontrado" text="Registre o que aconteceu hoje na obra." onClick={onCreate} />}</div>
}
function EmptyState({ title, text, onClick }: { title: string; text: string; onClick: () => void }) { return <div className="empty-state"><span><FolderOpen size={32} /></span><h2>{title}</h2><p>{text}</p><button className="primary-action" onClick={onClick}><Plus size={18} />Criar agora</button></div> }
function DialogShell({ title, subtitle, onClose, children, footer }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) { return <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><div><span>Novo registro</span><h2 id="dialog-title">{title}</h2><p>{subtitle}</p></div><button onClick={onClose} aria-label="Fechar"><X size={21} /></button></header><div className="dialog-body">{children}</div><footer>{footer}</footer></section></div> }

function ReportDialog({ projects, onClose, onSave }: { projects: Project[]; onClose: () => void; onSave: (report: Report) => void }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || ''); const [date, setDate] = useState(TODAY_ISO); const [period, setPeriod] = useState<Report['period']>('Integral'); const [weather, setWeather] = useState<Report['weather']>('Ensolarado'); const [workers, setWorkers] = useState(1); const [activities, setActivities] = useState(''); const [occurrences, setOccurrences] = useState(''); const [photos, setPhotos] = useState<File[]>([]); const [saving, setSaving] = useState(false); const fileRef = useRef<HTMLInputElement>(null)
  async function submit() { if (!projectId || !activities.trim()) return; setSaving(true); const photoIds = await Promise.all(photos.map(savePhoto)); const createdAt = new Date().toISOString(); onSave({ id: uid('report'), projectId, date, period, weather, workers, activities: activities.trim(), occurrences: occurrences.trim(), photoIds, createdAt }) }
  return <DialogShell title="Diário de obra" subtitle="Registre o essencial do dia em poucos passos." onClose={onClose} footer={<><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="save-button" disabled={!activities.trim() || saving} onClick={submit}>{saving ? 'Salvando...' : 'Salvar diário'}<Check size={17} weight="bold" /></button></>}><div className="form-grid">
    <label className="field field-wide"><span>Obra</span><div className="select-wrap"><select value={projectId} onChange={(e) => setProjectId(e.target.value)}>{projects.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select><CaretDown size={16} /></div></label>
    <label className="field"><span>Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label className="field"><span>Período</span><div className="select-wrap"><select value={period} onChange={(e) => setPeriod(e.target.value as Report['period'])}><option>Integral</option><option>Manhã</option><option>Tarde</option></select><CaretDown size={16} /></div></label>
    <fieldset className="field field-wide"><legend>Clima</legend><div className="choice-row">{(['Ensolarado', 'Nublado', 'Chuva'] as const).map((item) => <button type="button" key={item} className={weather === item ? 'selected' : ''} onClick={() => setWeather(item)}>{item === 'Ensolarado' ? <Sun size={18} /> : <CloudSun size={18} />}{item}</button>)}</div></fieldset>
    <label className="field field-wide"><span>Equipe presente</span><div className="number-input"><Users size={18} /><input type="number" min="0" value={workers} onChange={(e) => setWorkers(Number(e.target.value))} /><small>pessoas</small></div></label>
    <label className="field field-wide"><span>Atividades executadas <b>*</b></span><textarea rows={4} value={activities} onChange={(e) => setActivities(e.target.value)} placeholder="Descreva os serviços realizados, etapas concluídas e materiais utilizados..." /></label>
    <label className="field field-wide"><span>Ocorrências e observações</span><textarea rows={3} value={occurrences} onChange={(e) => setOccurrences(e.target.value)} placeholder="Imprevistos, atrasos, visitas técnicas ou pontos de atenção..." /></label>
    <div className="field field-wide"><span>Fotos do dia</span><input ref={fileRef} hidden type="file" accept="image/*" multiple capture="environment" onChange={(e) => setPhotos(Array.from(e.target.files || []))} /><button className="upload-zone" type="button" onClick={() => fileRef.current?.click()}><span><Camera size={24} /></span><div><strong>{photos.length ? `${photos.length} foto${photos.length > 1 ? 's' : ''} selecionada${photos.length > 1 ? 's' : ''}` : 'Adicionar fotos'}</strong><small>Use a câmera ou escolha da galeria</small></div><Plus size={18} /></button>{photos.length > 0 && <div className="pending-photos">{photos.map((file, index) => <PendingPhoto file={file} key={`${file.name}-${index}`} onRemove={() => setPhotos((items) => items.filter((_, i) => i !== index))} />)}</div>}</div>
  </div></DialogShell>
}
function PendingPhoto({ file, onRemove }: { file: File; onRemove: () => void }) { const url = useMemo(() => URL.createObjectURL(file), [file]); useEffect(() => () => URL.revokeObjectURL(url), [url]); return <span><img src={url} alt="Prévia" /><button type="button" onClick={onRemove}><Trash size={14} /></button></span> }
function ProjectDialog({ onClose, onSave }: { onClose: () => void; onSave: (project: Project) => void }) {
  const [name, setName] = useState(''); const [client, setClient] = useState(''); const [address, setAddress] = useState(''); const [status, setStatus] = useState<ProjectStatus>('Planejamento')
  function submit() { if (!name.trim() || !client.trim()) return; onSave({ id: uid('project'), name: name.trim(), client: client.trim(), address: address.trim() || 'Endereço não informado', status, progress: 0, color: '#d76a2d', updatedAt: new Date().toISOString() }) }
  return <DialogShell title="Cadastrar obra" subtitle="Crie o espaço onde os diários serão organizados." onClose={onClose} footer={<><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="save-button" disabled={!name.trim() || !client.trim()} onClick={submit}>Criar obra<Check size={17} /></button></>}><div className="form-grid"><label className="field field-wide"><span>Nome da obra <b>*</b></span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Residência Jardim América" autoFocus /></label><label className="field field-wide"><span>Cliente <b>*</b></span><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nome do cliente" /></label><label className="field field-wide"><span>Endereço</span><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, cidade e estado" /></label><label className="field field-wide"><span>Status inicial</span><div className="select-wrap"><select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}><option>Planejamento</option><option>Em andamento</option><option>Pausada</option></select><CaretDown size={16} /></div></label></div></DialogShell>
}
export default App
