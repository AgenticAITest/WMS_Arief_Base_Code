import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Breadcrumbs, {
  createBreadcrumbItems,
  useBreadcrumbs
} from "@client/components/console/Breadcrumbs";
import { PartnerForm } from "../../components/forms/PartnerForm";
import { useAuth } from "@client/provider/AuthProvider";
import { partnerApi } from "../../lib/api/partnerApi";
import { PartnerFormData, partnerFormSchema } from "../../schemas/partnerSchema";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { withModuleAuthorization } from "@client/components/auth/withModuleAuthorization";

const PartnerAdd = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Using the enhanced breadcrumbs with React state
  const { items: breadcrumbs } = useBreadcrumbs(
    createBreadcrumbItems([
      {
        label: "Partners",
        onClick: () => navigate("/console/modules/integration/partner"),
      },
      {
        label: "Add Partner",
      },
    ])
  );

  const handleSubmit = async (data: PartnerFormData) => {
    try {
      setIsLoading(true);
      await partnerApi.createPartner(data);
      toast.success('Partner created successfully');
      navigate('/console/modules/integration/partner');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create partner');
      throw error; // Re-throw to let form handle loading state
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/console/modules/integration/partner');
  };

  return (
    <div className="mx-2 space-y-6">
      <Breadcrumbs items={breadcrumbs} />
      
      <div>
        <h1 className="text-2xl font-bold">Add New Partner</h1>
        <p className="text-gray-600">Create a new business partner record</p>
      </div>

      <PartnerForm 
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default withModuleAuthorization(PartnerAdd, {
  moduleId: 'integration',
  moduleName: 'Integration'
});