import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { uploadDocument } from '@/lib/api'

function FileItem({ file, status, progress, error }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/60 border border-white/8"
    >
      <FileText size={18} className="text-brand-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{file.name}</p>
        {status === 'uploading' && (
          <div className="mt-1">
            <div className="h-1 bg-surface-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{progress}%</p>
          </div>
        )}
        {status === 'done' && <p className="text-xs text-emerald-400 mt-0.5">Processed ✓</p>}
        {status === 'error' && <p className="text-xs text-red-400 mt-0.5 truncate">{error}</p>}
      </div>
      <div className="flex-shrink-0">
        {status === 'uploading' && <Loader2 size={16} className="text-brand-400 animate-spin" />}
        {status === 'done'      && <CheckCircle2 size={16} className="text-emerald-400" />}
        {status === 'error'     && <XCircle size={16} className="text-red-400" />}
        {status === 'pending'   && <div className="w-4 h-4 rounded-full border-2 border-slate-600" />}
      </div>
    </motion.div>
  )
}

export default function UploadZone({ sessionId, onUploadComplete }) {
  const [fileStates, setFileStates] = useState([])
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!sessionId) {
      alert('Please select or create a session first.')
      return
    }

    const newItems = acceptedFiles.map(f => ({ file: f, status: 'pending', progress: 0, error: null }))
    setFileStates(prev => [...prev, ...newItems])
    setUploading(true)

    for (const item of newItems) {
      const idx = fileStates.length + newItems.indexOf(item)

      setFileStates(prev => prev.map((s, i) => i === idx ? { ...s, status: 'uploading' } : s))

      try {
        const result = await uploadDocument(
          sessionId,
          item.file,
          (pct) => setFileStates(prev => prev.map((s, i) => i === idx ? { ...s, progress: pct } : s))
        )
        setFileStates(prev => prev.map((s, i) => i === idx ? { ...s, status: 'done', progress: 100 } : s))
        onUploadComplete?.(result)
      } catch (err) {
        const msg = err.response?.data?.detail || err.message || 'Upload failed'
        setFileStates(prev => prev.map((s, i) => i === idx ? { ...s, status: 'error', error: msg } : s))
      }
    }
    setUploading(false)
  }, [sessionId, fileStates.length, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    disabled: uploading,
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
          ${isDragActive
            ? 'border-brand-400 bg-brand-500/10 shadow-glow-md'
            : 'border-white/15 hover:border-brand-500/50 hover:bg-white/3'}
          ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center
            ${isDragActive ? 'bg-brand-500/30 shadow-glow-md' : 'bg-white/6'} transition-all duration-300`}>
            <Upload size={28} className={isDragActive ? 'text-brand-300' : 'text-slate-400'} />
          </div>
          <div>
            <p className="text-white font-medium">
              {isDragActive ? 'Drop PDFs here…' : 'Drag & drop PDFs here'}
            </p>
            <p className="text-sm text-slate-500 mt-1">or click to browse — Annual reports, investor decks, financial statements</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">PDF only</span>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">Multiple files</span>
          </div>
        </motion.div>
      </div>

      {/* File list */}
      <AnimatePresence>
        {fileStates.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {fileStates.map((item, i) => (
              <FileItem key={i} {...item} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
