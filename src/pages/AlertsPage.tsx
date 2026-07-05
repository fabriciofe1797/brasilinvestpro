import React from 'react';
import SmartAlertsPanel from '../components/SmartAlertsPanel';
import { Bell } from 'lucide-react';

const AlertsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-emerald-500" />
            Alertas Inteligentes
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            Monitoramento proativo da sua carteira e do mercado.
          </p>
        </div>
      </div>

      {/* Full Panel */}
      <SmartAlertsPanel compact={false} maxItems={50} />
    </div>
  );
};

export default AlertsPage;
