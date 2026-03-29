/**
 * Unified Libraries page combining Catalog (browse packs) and Imported (manage) views.
 * Simplified for single-organization deployment.
 */

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CatalogView } from '@/features/libraries/components/CatalogView'
import { ImportedView } from '@/features/libraries/components/ImportedView'

export function Libraries() {
  const [activeTab, setActiveTab] = useState('catalog')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Libraries</h1>
        <p className="text-muted-foreground">
          Browse and manage library packs.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="imported">Imported</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-6">
          <CatalogView />
        </TabsContent>

        <TabsContent value="imported" className="mt-6">
          <ImportedView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
