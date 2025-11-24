import React from 'react';

interface GeneralComponentProps {
  // Add your props here
}

const GeneralComponent: React.FC<GeneralComponentProps> = (props) => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">General Component</h2>
      <p className="text-muted-foreground">
        This is a reusable component for General.
      </p>
    </div>
  );
};

export default GeneralComponent;
