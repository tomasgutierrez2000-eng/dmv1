'use client';

import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  currentFile?: File | null;
}

export default function FileUpload({ onFileSelect, currentFile }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
        isDragOver
          ? 'border-blue-400 bg-blue-50/60 scale-[1.01]'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 bg-white'
      }`}
      onClick={() => fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload data dictionary file"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      {currentFile ? (
        <div className="flex items-center justify-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
          <div className="text-left">
            <p className="text-sm font-medium text-gray-800">{currentFile.name}</p>
            <p className="text-sm text-gray-400">{(currentFile.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null as any);
            }}
            className="ml-3 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className={`w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors ${
            isDragOver ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Upload className={`w-5 h-5 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>
          <p className="text-sm text-gray-600 mb-1">
            {isDragOver ? 'Drop file here' : 'Drop data dictionary here or click to browse'}
          </p>
          <p className="text-sm text-gray-400">.xlsx or .xls format</p>
        </>
      )}
    </div>
  );
}
