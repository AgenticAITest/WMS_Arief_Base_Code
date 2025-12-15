import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { Switch } from '@client/components/ui/switch';
import { Button } from '@client/components/ui/button';
import { Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';

interface WorkflowStep {
  id: string;
  workflowId: string;
  stepKey: string;
  stepName: string;
  stepOrder: number;
  isInitial: boolean;
  isTerminal: boolean;
  requiredFields: any;
  isActive?: boolean;
}

interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
  steps?: WorkflowStep[];
}

const WorkflowSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poWorkflow, setPoWorkflow] = useState<Workflow | null>(null);
  const [soWorkflow, setSoWorkflow] = useState<Workflow | null>(null);
  const [stepStates, setStepStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);

      // Fetch all workflows
      const workflowsResponse = await axios.get('/api/modules/workflow/workflows?limit=100');
      const workflows = workflowsResponse.data.data;

      // Find PO and SO workflows
      const po = workflows.find((w: Workflow) => w.type === 'PURCHASE_ORDER' && w.isDefault);
      const so = workflows.find((w: Workflow) => w.type === 'SALES_ORDER' && w.isDefault);

      // Collect all step states in a single object to avoid race conditions
      const newStepStates: Record<string, boolean> = {};

      if (po) {
        // Fetch PO steps
        const poStepsResponse = await axios.get(`/api/modules/workflow/steps?workflowId=${po.id}&limit=100`);
        po.steps = poStepsResponse.data.data.sort((a: WorkflowStep, b: WorkflowStep) => a.stepOrder - b.stepOrder);
        setPoWorkflow(po);

        // Collect step states for PO
        po.steps.forEach((step: WorkflowStep) => {
          newStepStates[step.id] = step.isActive ?? true;
        });
      }

      if (so) {
        // Fetch SO steps
        const soStepsResponse = await axios.get(`/api/modules/workflow/steps?workflowId=${so.id}&limit=100`);
        so.steps = soStepsResponse.data.data.sort((a: WorkflowStep, b: WorkflowStep) => a.stepOrder - b.stepOrder);
        setSoWorkflow(so);

        // Collect step states for SO
        so.steps.forEach((step: WorkflowStep) => {
          newStepStates[step.id] = step.isActive ?? true;
        });
      }

      // Set all step states at once to avoid race conditions
      setStepStates(newStepStates);

    } catch (error: any) {
      console.error('Error fetching workflows:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStep = (stepId: string) => {
    setStepStates(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);

      // Collect all steps that need to be updated
      const allSteps = [
        ...(poWorkflow?.steps || []),
        ...(soWorkflow?.steps || [])
      ];

      // Update each step with its new active state
      const updatePromises = allSteps.map(step => {
        const isActive = stepStates[step.id];
        return axios.put(`/api/modules/workflow/steps/${step.id}`, {
          isActive
        });
      });

      await Promise.all(updatePromises);

      toast.success('Workflow settings saved successfully');
      
      // Refresh the data
      await fetchWorkflows();

    } catch (error) {
      console.error('Error saving workflow settings:', error);
      toast.error('Failed to save workflow settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading workflow settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Workflow Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure order processing workflows. Enabled steps automatically appear in the sidebar menu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase Order Workflow */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Workflow</CardTitle>
            <CardDescription>
              Configure PO processing steps. Enabled steps appear in the Inbound menu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {poWorkflow?.steps?.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    stepStates[step.id] 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`font-medium ${
                    stepStates[step.id] 
                      ? 'text-foreground' 
                      : 'text-muted-foreground'
                  }`}>
                    {step.stepName}
                  </span>
                </div>
                <Switch
                  checked={stepStates[step.id]}
                  onCheckedChange={() => handleToggleStep(step.id)}
                  disabled={step.isInitial || step.isTerminal}
                />
              </div>
            ))}
            {!poWorkflow?.steps?.length && (
              <p className="text-center text-muted-foreground py-8">
                No workflow steps configured
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sales Order Workflow */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Order Workflow</CardTitle>
            <CardDescription>
              Configure SO processing steps. Enabled steps appear in the Outbound menu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {soWorkflow?.steps?.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    stepStates[step.id] 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`font-medium ${
                    stepStates[step.id] 
                      ? 'text-foreground' 
                      : 'text-muted-foreground'
                  }`}>
                    {step.stepName}
                  </span>
                </div>
                <Switch
                  checked={stepStates[step.id]}
                  onCheckedChange={() => handleToggleStep(step.id)}
                  disabled={step.isInitial || step.isTerminal}
                />
              </div>
            ))}
            {!soWorkflow?.steps?.length && (
              <p className="text-center text-muted-foreground py-8">
                No workflow steps configured
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button 
          onClick={handleSaveChanges} 
          disabled={saving}
          size="lg"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default withModuleAuthorization(WorkflowSettings, {
  moduleId: 'workflow',
  moduleName: 'Workflow'
});
