import { useState } from "react";
import { CloudUpload, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLiveQuery } from "dexie-react-hooks";
import { countItems, getLastBackup } from "../services/backup";
import { usePreference } from "../hooks/usePreference";
import { sinceLabel } from "../screens/BackupSection";
import { spring } from "./motion";

const DAY = 86_400_000;

/**
 * Rappel discret de sauvegarde, affiché sur l'écran Globe :
 * - jamais sauvegardé alors qu'il y a déjà du contenu
 * - dernière sauvegarde de plus de 14 jours (et du nouveau depuis)
 * - beaucoup de contenu ajouté depuis la dernière sauvegarde
 * Affiché en petite pastille dans le coin ; le message s'ouvre au toucher.
 * Peut être mis de côté pour 3 jours.
 */
export function BackupReminder({ onBackup }: { onBackup: () => void }) {
  const [snoozeUntil, setSnoozeUntil] = usePreference("backupSnoozeUntil", 0);
  const message = useLiveQuery(async () => {
    const [last, items] = await Promise.all([getLastBackup(), countItems()]);
    if (!last)
      return items >= 5
        ? "Tu n’as encore jamais sauvegardé tes données."
        : null;
    const added = items - last.items;
    if (added >= 30)
      return `${added} nouveautés depuis ta dernière sauvegarde.`;
    if (Date.now() - new Date(last.at).getTime() > 14 * DAY && added > 0)
      return `Dernière sauvegarde ${sinceLabel(last.at)}.`;
    return null;
  }, []);

  const [expanded, setExpanded] = useState(false);
  const show = !!message && Date.now() > snoozeUntil;

  return (
    // Emplacement fixe de la pastille ; le détail s'ouvre par-dessus, sans pousser le titre
    <div className="relative size-11">
      <AnimatePresence>
        {show && !expanded && (
          // Pastille discrète dans le coin : le détail s'ouvre au toucher
          <motion.button
            key="pastille"
            type="button"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={spring}
            onClick={() => setExpanded(true)}
            aria-label="Rappel de sauvegarde"
            className="glass pointer-events-auto absolute top-0 right-0 flex size-11 items-center justify-center rounded-full"
          >
            <CloudUpload size={20} className="text-orange" />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-orange ring-2 ring-elevated" />
          </motion.button>
        )}
        {show && expanded && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring}
            style={{ transformOrigin: "top right" }}
            className="glass pointer-events-auto absolute top-0 right-0 w-60 rounded-[20px] p-3"
            role="status"
          >
            <div className="flex items-start gap-2">
              <CloudUpload size={18} className="mt-0.5 shrink-0 text-orange" />
              <span className="text-footnote min-w-0 flex-1 leading-snug">
                {message}
              </span>
              <button
                type="button"
                aria-label="Réduire"
                onClick={() => setExpanded(false)}
                className="-mt-1.5 -mr-1.5 flex size-8 shrink-0 items-center justify-center text-label-2"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  onBackup();
                }}
                className="text-footnote min-h-9 flex-1 rounded-full bg-blue font-semibold text-white"
              >
                Sauvegarder
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  setSnoozeUntil(Date.now() + 3 * DAY);
                }}
                className="text-footnote min-h-9 flex-1 rounded-full bg-fill font-semibold text-label"
              >
                Plus tard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
