// Notifications du transporteur : e-mails et SMS reçus, QR envoyés par WhatsApp (lecture → notif.read).
import { useEffect, useState } from 'react';
import { usePortFlow } from '../../../providers/PortFlowProvider.jsx';
import { Drawer, Button, EmptyState } from '../../../components/ui/index.js';
import { MessageRow } from '../../../components/domain/index.js';
import { cn } from '../../../lib/cn.js';
import { useTransporteurApi } from '../api.js';

export function NotificationsDrawer({ open, onClose, messages, user }) {
  const tapi = useTransporteurApi();
  const { refresh } = usePortFlow();
  const [seen, setSeen] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [limit, setLimit] = useState(25);
  useEffect(() => {
    if (!open) return;
    setSeen(user.notifSeenAt || '');
    // La réponse de notif.read porte encore l'ancien horodatage de lecture : on relit l'état pour remettre la cloche à zéro
    tapi.markNotificationsRead().then(r => { if (r.ok) refresh(); });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Drawer open={open} onClose={onClose} title="Notifications" size="md"
      description="E-mails et SMS envoyés par PortFlow, et QR codes envoyés par WhatsApp à vos chauffeurs.">
      {messages.length === 0 ? <EmptyState icon="inbox" title="Aucune notification" /> : (
        <div className="-mx-2 flex flex-col gap-0.5">
          {messages.slice(0, limit).map(m => (
            <div key={m.id}>
              <MessageRow message={m} unread={seen !== null && m.at > seen} showTo={m.channel === 'whatsapp'} onClick={() => setOpenId(openId === m.id ? null : m.id)} />
              {openId === m.id && (
                <pre className={cn('mx-2 mb-2 mt-1 whitespace-pre-wrap break-words rounded-xl p-3.5 font-sans text-[13px] leading-relaxed text-slate-800',
                  m.channel === 'whatsapp' ? 'bg-[#e7fbe6]' : m.channel === 'sms' ? 'bg-violet-50' : 'border border-slate-200 bg-slate-50')}>{m.body}</pre>
              )}
            </div>
          ))}
        </div>
      )}
      {messages.length > limit && <div><Button variant="ghost" size="sm" icon="chevron-down" onClick={() => setLimit(l => l + 25)}>Afficher plus</Button></div>}
    </Drawer>
  );
}
