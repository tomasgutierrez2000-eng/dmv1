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
      className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-gray-50/80 transition-colors bg-gray-50/50"
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
            <p className="text-base font-semibold text-gray-800">{currentFile.name}</p>
            <p className="text-sm text-gray-500">{(currentFile.size / 1024).toFixed(2)} KB</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null as any);
            }}
            className="ml-4 text-gray-500 hover:text-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="w-14 h-14 mx-auto mb-4 text-gray-500" />
          <p className="text-base text-gray-700 mb-2">Drop bank data dictionary (Excel) here or click to browse</p>
          <p className="text-sm text-gray-500">L1/L2/L3 schema in .xlsx or .xls</p>
        </>
      )}
    </div>
  );
}
