import { Suspense } from 'react';
import DataElementsMainView from '@/components/data-elements/DataElementsMainView';
import { DataElementsLoading } from '@/components/data-elements/DataElementsStates';

export const metadata = {
  title: 'Data Elements Library',
  description: 'Browse and search all tables, fields, and relationships across the data model',
};

export default function DataElementsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-6"><DataElementsLoading /></div>}>
      <DataElementsMainView />
    </Suspense>
  );
}
