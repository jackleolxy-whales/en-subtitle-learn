import { useState, useCallback, useRef } from 'react';
import { X, Download, Upload, GitBranch, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  exportGitDataAsFile,
  importGitDataFromFile,
  exportGitData,
} from '../utils/gitData';

interface GitDataDialogProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'main' | 'export-done' | 'import-done' | 'import-error';

export function GitDataDialog({ open, onClose }: GitDataDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('main');
  const [importError, setImportError] = useState('');
  const [stats, setStats] = useState<{ progress: number; episodes: number; phrases: number } | null>(null);

  const handleExport = useCallback(() => {
    const data = exportGitData();
    setStats({
      progress: Object.keys(data.progress).length,
      episodes: data.episodes.length,
      phrases: data.phrases.length,
    });
    exportGitDataAsFile();
    setStep('export-done');
  }, []);

  const handleImportClick = useCallback(() => {
    setStep('main');
    setImportError('');
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      const result = await importGitDataFromFile(file);
      if (result.success) {
        setStep('import-done');
      } else {
        setImportError(result.error ?? '未知错误');
        setStep('import-error');
      }
    },
    [],
  );

  const handleImportConfirm = useCallback(() => {
    window.location.reload();
  }, []);

  const handleClose = useCallback(() => {
    setStep('main');
    setImportError('');
    setStats(null);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative glass rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-text-primary">Git 版本管理</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors text-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />

          {step === 'main' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                导出学习数据为 JSON 文件，可提交到 Git 进行备份与版本管理。导入时可从备份文件恢复数据。
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExport}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl glass-light border border-black/10 hover:border-primary/40 transition-all"
                >
                  <Download className="w-6 h-6 text-primary" />
                  <span className="text-sm font-medium text-text-primary">导出数据</span>
                  <span className="text-xs text-text-muted">下载 JSON 文件</span>
                </button>
                <button
                  onClick={handleImportClick}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl glass-light border border-black/10 hover:border-primary/40 transition-all"
                >
                  <Upload className="w-6 h-6 text-primary" />
                  <span className="text-sm font-medium text-text-primary">导入数据</span>
                  <span className="text-xs text-text-muted">从文件恢复</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-black/[0.03] text-xs text-text-muted space-y-1">
                <p>• 导出包含：学习进度、导入剧集、话术卡片</p>
                <p>• 建议将 learn-data-*.json 放入 data/ 目录并提交到 Git</p>
                <p>• 导入后需刷新页面生效</p>
              </div>
            </div>
          )}

          {step === 'export-done' && stats && (
            <div className="py-4 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
                <p className="text-text-primary font-semibold">导出成功</p>
              </div>
              <div className="bg-surface-light/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">学习进度</span>
                  <span className="text-text-primary">{stats.progress} 集</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">导入剧集</span>
                  <span className="text-text-primary">{stats.episodes} 集</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">话术卡片</span>
                  <span className="text-text-primary">{stats.phrases} 张</span>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-all"
              >
                完成
              </button>
            </div>
          )}

          {step === 'import-done' && (
            <div className="py-6 space-y-5">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
                <p className="text-text-primary font-semibold">导入成功</p>
                <p className="text-sm text-text-muted text-center">刷新页面后生效</p>
              </div>
              <button
                onClick={handleImportConfirm}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-all"
              >
                刷新页面
              </button>
            </div>
          )}

          {step === 'import-error' && (
            <div className="py-6 space-y-5">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-danger/20 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-danger" />
                </div>
                <p className="text-danger font-semibold">导入失败</p>
                <p className="text-sm text-text-muted text-center">{importError}</p>
              </div>
              <button
                onClick={() => setStep('main')}
                className="w-full py-3 rounded-xl border border-white/10 text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all"
              >
                返回
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
