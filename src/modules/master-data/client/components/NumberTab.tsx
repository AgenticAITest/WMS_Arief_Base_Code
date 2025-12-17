import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import { Input } from '@client/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@client/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/components/ui/alert-dialog';
import NumberDialog from './NumberDialog';

interface DocumentNumberConfig {
  id: string;
  documentType: string;
  documentName: string;
  periodFormat: string;
  prefix1Label: string | null;
  prefix1DefaultValue: string | null;
  prefix1Required: boolean;
  prefix2Label: string | null;
  prefix2DefaultValue: string | null;
  prefix2Required: boolean;
  sequenceLength: number;
  sequencePadding: string;
  separator: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_CONFIGS = [
  { documentType: 'PO', documentName: 'Purchase Order', periodFormat: 'YYMM', prefix1Label: 'Warehouse', prefix1DefaultValue: 'WH1', prefix1Required: true },
  { documentType: 'GRN', documentName: 'Goods Receipt Note', periodFormat: 'YYMM', prefix1Label: 'Warehouse', prefix1DefaultValue: 'WH1', prefix1Required: true },
  { documentType: 'PUTAWAY', documentName: 'Putaway Instructions', periodFormat: 'YYMM', prefix1Label: 'Warehouse', prefix1DefaultValue: 'WH1', prefix1Required: true },
  { documentType: 'SO', documentName: 'Sales Order', periodFormat: 'YYMM', prefix1Label: 'Region', prefix1DefaultValue: 'NORTH', prefix1Required: false },
  { documentType: 'ALLOC', documentName: 'Allocate SO', periodFormat: 'YYMM', prefix1Label: 'Warehouse', prefix1DefaultValue: 'WH1', prefix1Required: true },
  { documentType: 'PICK', documentName: 'Pick Instructions', periodFormat: 'YYMM', prefix1Label: 'Warehouse', prefix1DefaultValue: 'WH1', prefix1Required: true },
  { documentType: 'PACK', documentName: 'Pack Instructions', periodFormat: 'YYMM', prefix1Label: 'Warehouse', prefix1DefaultValue: 'WH1', prefix1Required: true },
  { documentType: 'SHIP', documentName: 'Ship Instructions', periodFormat: 'YYMM', prefix1Label: 'Carrier', prefix1DefaultValue: 'DHL', prefix1Required: false },
  { documentType: 'DELIVERY', documentName: 'Delivery Note', periodFormat: 'YYMM', prefix1Label: 'Region', prefix1DefaultValue: 'NORTH', prefix1Required: false },
  { documentType: 'STOCKADJ', documentName: 'Stock Adjustment', periodFormat: 'YYMM', prefix1Label: 'Warehouse', prefix1DefaultValue: 'WH1', prefix1Required: true },
  { documentType: 'RELOC', documentName: 'Stock Relocation', periodFormat: 'YYMM', prefix1Label: 'Warehouse', prefix1DefaultValue: 'WH1', prefix1Required: true },
  { documentType: 'CYCCOUNT', documentName: 'Cycle Count/Audit', periodFormat: 'YYMM', prefix1Label: 'Warehouse', prefix1DefaultValue: 'WH1', prefix1Required: true },
  { documentType: 'RMA', documentName: 'Return Merchandise Authorization', periodFormat: 'YYMM', prefix1Label: 'Reason', prefix1DefaultValue: 'DEF', prefix1Required: false },
  { documentType: 'TRANSFER', documentName: 'Transfer Order', periodFormat: 'YYMM', prefix1Label: 'From', prefix1DefaultValue: 'WH1', prefix1Required: true, prefix2Label: 'To', prefix2DefaultValue: 'WH2', prefix2Required: true },
  { documentType: 'QC', documentName: 'Quality Control/Inspection', periodFormat: 'YYMM', prefix1Label: 'Warehouse', prefix1DefaultValue: 'WH1', prefix1Required: true },
  { documentType: 'LOAD', documentName: 'Loading List', periodFormat: 'YYMM', prefix1Label: 'Dock', prefix1DefaultValue: 'D1', prefix1Required: true },
];

const PROCESS_GROUPS = {
  'Purchase Orders': {
    description: 'Inbound procurement and receiving operations',
    types: ['PO', 'GRN', 'PUTAWAY'],
  },
  'Sales Orders': {
    description: 'Outbound fulfillment and shipping operations',
    types: ['SO', 'ALLOC', 'PICK', 'PACK', 'SHIP', 'DELIVERY'],
  },
  'Inventory Management': {
    description: 'Stock control and warehouse operations',
    types: ['STOCKADJ', 'RELOC', 'CYCCOUNT'],
  },
  'Other Operations': {
    description: 'Additional warehouse processes',
    types: ['RMA', 'TRANSFER', 'QC', 'LOAD'],
  },
};

const NumberTab = () => {
  const [configs, setConfigs] = useState<DocumentNumberConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DocumentNumberConfig | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<DocumentNumberConfig | null>(null);
  const [initializing, setInitializing] = useState(false);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/modules/document-numbering/configs', {
        params: {
          page: 1,
          limit: 100,
          search: searchTerm || undefined,
        },
      });
      setConfigs(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch configurations');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultConfigs = async () => {
    try {
      setInitializing(true);
      let successCount = 0;
      let skipCount = 0;
      
      for (const config of DEFAULT_CONFIGS) {
        try {
          await axios.post('/api/modules/document-numbering/configs', {
            ...config,
            sequenceLength: 4,
            sequencePadding: '0',
            separator: '-',
            isActive: true,
          });
          successCount++;
        } catch (error: any) {
          if (error.response?.status === 409) {
            skipCount++;
          } else {
            throw error;
          }
        }
      }
      
      if (successCount > 0) {
        toast.success(`Created ${successCount} document type${successCount > 1 ? 's' : ''}${skipCount > 0 ? ` (${skipCount} already existed)` : ''}`);
      } else {
        toast.info('All default document types already exist');
      }
      fetchConfigs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initialize default configurations');
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [searchTerm]);

  const handleAdd = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: DocumentNumberConfig) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (item: DocumentNumberConfig) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      await axios.delete(`/api/modules/document-numbering/configs/${deletingItem.id}`);
      toast.success('Configuration deleted successfully');
      fetchConfigs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete configuration');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setEditingItem(null);
    fetchConfigs();
  };

  const filteredConfigs = configs.filter(
    (config) =>
      config.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.documentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupConfigsByProcess = () => {
    const grouped: { [key: string]: DocumentNumberConfig[] } = {};
    
    Object.entries(PROCESS_GROUPS).forEach(([groupName, groupData]) => {
      grouped[groupName] = groupData.types
        .map(type => filteredConfigs.find(c => c.documentType === type))
        .filter((c): c is DocumentNumberConfig => c !== undefined);
    });
    
    return grouped;
  };

  const generatePreviewNumber = (config: DocumentNumberConfig): string => {
    const parts = [config.documentType, '[PERIOD]'];
    if (config.prefix1DefaultValue) parts.push(config.prefix1DefaultValue);
    if (config.prefix2DefaultValue) parts.push(config.prefix2DefaultValue);
    parts.push('0'.repeat(config.sequenceLength));
    return parts.join(config.separator);
  };

  const renderConfigRow = (config: DocumentNumberConfig) => (
    <TableRow key={config.id}>
      <TableCell>
        <span className="font-mono font-semibold text-sm">{config.documentType}</span>
      </TableCell>
      <TableCell>{config.documentName}</TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {generatePreviewNumber(config)}
        </code>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{config.periodFormat}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {config.prefix1Label && (
            <div className="text-xs">
              <span className="text-muted-foreground">{config.prefix1Label}:</span>{' '}
              <span className="font-medium">{config.prefix1DefaultValue || 'N/A'}</span>
              {config.prefix1Required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </div>
          )}
          {config.prefix2Label && (
            <div className="text-xs">
              <span className="text-muted-foreground">{config.prefix2Label}:</span>{' '}
              <span className="font-medium">{config.prefix2DefaultValue || 'N/A'}</span>
              {config.prefix2Required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </div>
          )}
          {!config.prefix1Label && !config.prefix2Label && (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {config.isActive ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Inactive
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(config)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(config)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const groupedConfigs = groupConfigsByProcess();
  const hasAnyConfigs = Object.values(groupedConfigs).some(group => group.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Document Numbering Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Configure document number formats for all warehouse operations
          </p>
        </div>
        <div className="flex gap-2">
          {configs.length === 0 && !loading && (
            <Button onClick={initializeDefaultConfigs} disabled={initializing} variant="outline">
              {initializing ? 'Initializing...' : 'Initialize Defaults'}
            </Button>
          )}
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Configuration
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by document type or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="border rounded-lg p-10 text-center text-muted-foreground">
          Loading...
        </div>
      ) : !hasAnyConfigs ? (
        <div className="border rounded-lg p-10 text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground">No configurations found</p>
            {configs.length === 0 && (
              <Button onClick={initializeDefaultConfigs} disabled={initializing} size="sm">
                {initializing ? 'Initializing...' : 'Initialize 15 Default Document Types'}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={Object.keys(PROCESS_GROUPS)} className="space-y-4">
          {Object.entries(PROCESS_GROUPS).map(([groupName, groupData]) => {
            const groupConfigs = groupedConfigs[groupName];
            if (groupConfigs.length === 0) return null;

            return (
              <AccordionItem key={groupName} value={groupName} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base">{groupName}</h3>
                      <Badge variant="secondary">{groupConfigs.length}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-normal">
                      {groupData.description}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Document Name</TableHead>
                          <TableHead>Format Preview</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Prefixes</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupConfigs.map(renderConfigRow)}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <NumberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        onSuccess={handleDialogSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the configuration for{' '}
              <strong>{deletingItem?.documentName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NumberTab;
