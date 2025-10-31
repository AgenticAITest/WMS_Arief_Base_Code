import { useState, useEffect } from 'react';

interface WorkflowStep {
  id: string;
  workflowId: string;
  stepKey: string;
  stepName: string;
  stepOrder: number;
  isActive: boolean;
  isInitial: boolean;
  isTerminal: boolean;
  requiredFields: any;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStepsResponse {
  workflow: any;
  steps: WorkflowStep[];
}

export const useSalesOrderWorkflowSteps = () => {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkflowSteps = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/modules/sales-order/workflow-steps', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch workflow steps');
        }

        const data: WorkflowStepsResponse = await response.json();
        setSteps(data.steps || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching workflow steps:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowSteps();
  }, []);

  return { steps, loading, error };
};
