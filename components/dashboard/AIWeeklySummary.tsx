import React, { useState, useCallback } from 'react';
import { Task, UserData } from '../../types';
import { ICONS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import { generateAISummary } from '../../services/geminiService';

interface AIWeeklySummaryProps {
    tasks: Task[];
    users: UserData[];
}

const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    let inList = false;
    const elements = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Sanitize to prevent basic injection issues
        line = line.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // Bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Headings
        if (line.startsWith('### ')) {
            elements.push(<h3 key={i} className="text-lg font-semibold mt-4 mb-2 text-slate-800 dark:text-slate-100">{line.substring(4)}</h3>);
            continue;
        }

        // List items
        if (line.startsWith('* ')) {
            const listItem = <li key={i} className="ml-5 list-disc">{line.substring(2)}</li>;
            if (!inList) {
                inList = true;
                elements.push(<ul key={`ul-${i}`} className="space-y-1">{listItem}</ul>);
            } else {
                // Find the last UL and append to it
                const lastElement = elements[elements.length - 1];
                if (lastElement.type === 'ul') {
                    lastElement.props.children.push(listItem);
                }
            }
        } else {
            inList = false;
            elements.push(<p key={i}>{line}</p>);
        }
    }
    
    return <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">{elements}</div>;
};

const AIWeeklySummary: React.FC<AIWeeklySummaryProps> = ({ tasks, users }) => {
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateSummary = useCallback(async () => {
        setLoading(true);
        setError('');
        setSummary('');

        const today = new Date();
        const oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        
        const userMap = new Map(users.map(u => [u.uid, u.nama]));

        const relevantTasks = tasks
            .filter(task => {
                const updatedDate = task.updatedAt ? new Date(task.updatedAt) : new Date(0);
                return updatedDate >= oneWeekAgo;
            })
            .map(task => ({
                title: task.title,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate,
                assignedTo: userMap.get(task.assignedTo) || 'Unknown',
                updatedAt: task.updatedAt,
            }));

        if (relevantTasks.length === 0) {
            setError("Tidak ada aktivitas tugas yang relevan dalam seminggu terakhir untuk membuat ringkasan.");
            setLoading(false);
            return;
        }

        const prompt = `Analyze the following JSON data of tasks updated in the last week and generate a summary. Today's date is ${today.toISOString().split('T')[0]}. Data: ${JSON.stringify(relevantTasks)}`;

        try {
            const result = await generateAISummary(prompt);
            setSummary(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    }, [tasks, users]);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                       {ICONS.magic}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ringkasan Mingguan AI</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Dapatkan insight cepat tentang progres tim Anda.</p>
                    </div>
                </div>
                 <button 
                    onClick={handleGenerateSummary} 
                    disabled={loading}
                    className="mt-4 sm:mt-0 flex-shrink-0 flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                    {loading ? "Menganalisis..." : "Buat Ringkasan"}
                </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 min-h-[100px]">
                {loading && <LoadingSpinner text="AI sedang menganalisis data minggu ini..." />}
                {error && <div className="text-center text-red-500 bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">{error}</div>}
                {summary && <SimpleMarkdownRenderer text={summary} />}
                {!loading && !error && !summary && (
                     <div className="text-center text-slate-500 dark:text-slate-400 pt-6">
                        <p>Klik "Buat Ringkasan" untuk melihat analisis AI.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIWeeklySummary;
