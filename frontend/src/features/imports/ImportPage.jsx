import { useRef, useState } from 'react'
import { importPeople } from './importService.js'
import './ImportPage.css'

const MAX_FILE_SIZE = 10 * 1024 * 1024

function fileSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function rowErrorText(errors) {
  return Object.entries(errors ?? {}).flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`)).join(' · ')
}

export default function ImportPage() {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [batch, setBatch] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function selectFile(nextFile) {
    setBatch(null)
    setNotice('')
    setError('')
    setFile(null)
    if (!nextFile) return setFile(null)
    if (!/\.(csv|xlsx)$/i.test(nextFile.name)) return setError('Selecciona un archivo CSV o XLSX.')
    if (nextFile.size > MAX_FILE_SIZE) return setError('El archivo supera el límite de 10 MB.')
    setFile(nextFile)
  }

  async function submit(event) {
    event.preventDefault()
    if (!file || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await importPeople(file)
      setBatch(result)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (requestError) {
      if (requestError.status === 409 && requestError.data) {
        setBatch(requestError.data)
        setNotice('Este archivo ya se había procesado; aquí está su resultado anterior.')
      } else {
        const fileError = requestError.errors?.file?.[0]
        setError(fileError ?? requestError.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="imports-page" aria-labelledby="imports-title">
      <header className="imports-heading">
        <div><p className="imports-eyebrow">ADMINISTRACIÓN · PERSONAS</p><h1 id="imports-title">Carga masiva</h1><p>Importa varias cuentas a la vez y revisa el resultado fila por fila.</p></div>
        <a className="imports-template-link" download="plantilla-importacion.csv" href="/plantilla-importacion.csv">Descargar plantilla <span aria-hidden="true">↓</span></a>
      </header>

      <form className="imports-card" onSubmit={submit}>
        <div className="imports-card-heading"><span className="imports-upload-icon" aria-hidden="true">↥</span><div><h2>Selecciona el archivo</h2><p>CSV o Excel XLSX · máximo 10 MB y 100 filas</p></div></div>
        <label className={`imports-dropzone${file ? ' has-file' : ''}`} htmlFor="imports-file">
          <input accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" id="imports-file" onChange={(event) => selectFile(event.target.files?.[0])} ref={inputRef} type="file" />
          <span className="imports-dropzone-mark" aria-hidden="true">{file ? '✓' : '＋'}</span>
          <strong>{file ? file.name : 'Elige un archivo desde tu equipo'}</strong>
          <span>{file ? fileSize(file.size) : 'También puedes hacer clic para buscarlo'}</span>
          {!file && <span className="imports-browse-button">Buscar archivo</span>}
        </label>

        <div className="imports-columns">
          <p><strong>Columnas requeridas en la primera fila</strong></p>
          <code>first_name, middle_names, first_surname, second_surname, identification, birth_date, username, password, status</code>
          <small>Las fechas usan formato AAAA-MM-DD. Deja vacíos middle_names, birth_date o status si no aplican; status vacío crea la cuenta como activa. Las importaciones crean cuentas con rol Usuario.</small>
        </div>
        <div className="imports-security-note"><span aria-hidden="true">◇</span><p>El archivo contiene contraseñas. Usa una conexión segura y elimina la copia local cuando termine la carga. El sistema conserva el resultado y los errores, pero nunca guarda el archivo ni las contraseñas de la hoja.</p></div>
        {error && <p className="imports-message imports-message-error" role="alert">{error}</p>}
        {notice && <p className="imports-message imports-message-info" role="status">{notice}</p>}
        <footer className="imports-actions"><span>Los errores de una fila no cancelan las filas válidas.</span><button className="imports-submit" disabled={!file || busy} type="submit">{busy ? 'Procesando…' : 'Validar e importar'} <span aria-hidden="true">→</span></button></footer>
      </form>

      {batch && (
        <section className="imports-result" aria-labelledby="imports-result-title" aria-live="polite">
          <header><div><p className="imports-eyebrow">RESULTADO DEL LOTE · #{batch.id}</p><h2 id="imports-result-title">{batch.status === 'completed' ? 'Importación completa' : batch.status === 'partial' ? 'Importación con observaciones' : 'No se importaron filas'}</h2></div><span className={`imports-result-state is-${batch.status}`}>{batch.status === 'completed' ? 'Completada' : batch.status === 'partial' ? 'Parcial' : 'Con errores'}</span></header>
          <div className="imports-result-counts"><p><strong>{batch.success_rows}</strong><span>Importadas</span></p><p><strong>{batch.error_rows}</strong><span>Con errores</span></p><p><strong>{batch.total_rows}</strong><span>Filas leídas</span></p></div>
          {batch.rows?.some((row) => row.status === 'failed') && <div className="imports-errors"><h3>Revisa estas filas y vuelve a cargar un archivo corregido</h3><ol>{batch.rows.filter((row) => row.status === 'failed').map((row) => <li key={row.row_number}><strong>Fila {row.row_number}</strong><span>{rowErrorText(row.errors)}</span></li>)}</ol></div>}
        </section>
      )}
    </section>
  )
}
