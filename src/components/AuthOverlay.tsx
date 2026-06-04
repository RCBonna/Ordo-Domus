import { motion } from 'motion/react';
import { Package } from 'lucide-react';
import Auth from './Auth';

export function AuthOverlay() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md dark:bg-black/60" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 dark:border-border dark:bg-card"
      >
        <div className="p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-[20px] flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
              <Package className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-foreground">Bem-vindo ao Ordo</h2>
            <p className="text-slate-400 text-sm font-medium mt-1 dark:text-muted-foreground">Sua casa em ordem, sem esforço</p>
          </div>
          <Auth />
        </div>
      </motion.div>
    </div>
  );
}
