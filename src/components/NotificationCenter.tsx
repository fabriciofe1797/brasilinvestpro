import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Bell, Check, X, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const NotificationCenter: React.FC = () => {
  const { notifications, markAllAsRead } = useStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#050D0B] animate-pulse" />
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg md:max-w-xl bg-[#0B1C17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                <h3 className="font-bold text-white">{t('notificationCenter.title')}</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                        onClick={() => markAllAsRead()}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                        <Check className="w-3 h-3" /> {t('notificationCenter.markRead')}
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10"
                    aria-label={t('notificationCenter.closeAria')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('notificationCenter.allCalm')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map((notif) => (
                      <div key={notif.id} className={cn("p-4 hover:bg-white/5 transition-colors flex gap-3", !notif.read && "bg-emerald-500/5")}>
                        <div className="mt-1 shrink-0">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className={cn("text-sm font-bold mb-1", notif.read ? "text-gray-300" : "text-white")}>
                            {notif.title}
                          </h4>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-gray-600 mt-2 block">
                            {t('notificationCenter.dateTime', { data: new Date(notif.date).toLocaleDateString(i18n.language), hora: new Date(notif.date).toLocaleTimeString(i18n.language, {hour: '2-digit', minute:'2-digit'}) })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
