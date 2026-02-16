'use client';

import { useRef } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  currentFile?: File | null;
}

export default function FileUpload({ onFileSelect, currentFile }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-900/50"
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
      {currentFile ? (
        <div className="flex items-center justify-center space-x-3">
          <FileSpreadsheet className="w-8 h-8 text-green-500" />
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-200">{currentFile.name}</p>
            <p className="text-xs text-gray-400">{(currentFile.size / 1024).toFixed(2)} KB</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null as any);
            }}
            className="ml-4 text-gray-400 hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm text-gray-300 mb-2">Drop bank data dictionary (Excel) here or click to browse</p>
          <p className="text-xs text-gray-500">L1/L2/L3 schema in .xlsx or .xls</p>
        </>
      )}
    </div>
  );
}
