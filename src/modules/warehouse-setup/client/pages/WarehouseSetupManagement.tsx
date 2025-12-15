import { withModuleAuthorization } from '@client/components/auth/withModuleAuthorization';
import { WarehouseHierarchyView } from '../components/WarehouseHierarchyView';

const WarehouseSetupManagement = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Warehouse Setup</h1>
        <p className="text-muted-foreground">
          Configure your warehouse hierarchy: warehouses, zones, aisles, shelves, and storage bins
        </p>
      </div>

      <WarehouseHierarchyView />
    </div>
  );
};

export default withModuleAuthorization(WarehouseSetupManagement, {
  moduleId: 'warehouse-setup',
  moduleName: 'Warehouse Setup'
});
