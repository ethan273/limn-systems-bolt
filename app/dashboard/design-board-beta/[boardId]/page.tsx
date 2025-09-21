import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import DesignBoardClient from './DesignBoardClient';

interface PageProps {
  params: Promise<{
    boardId: string;
  }>;
}

export default async function BoardPage({ params }: PageProps) {
  const { boardId } = await params;
  return (
    <div className="h-screen bg-[#f7f7f7] overflow-hidden">
      <Suspense fallback={
        <div className="h-screen bg-[#f7f7f7] flex items-center justify-center">
          <Card className="p-8 max-w-md mx-auto">
            <CardContent className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Loading Design Board</h3>
              <p className="text-slate-600 font-medium">Preparing your collaborative workspace...</p>
            </CardContent>
          </Card>
        </div>
      }>
        <DesignBoardClient boardId={boardId} />
      </Suspense>
    </div>
  );
}