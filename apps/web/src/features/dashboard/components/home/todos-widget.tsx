import Link from 'next/link';
import type { DashboardTodo } from '@/features/dashboard/model/types';

type TodosWidgetProps = {
  todos: DashboardTodo[];
};

export function TodosWidget({ todos }: TodosWidgetProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">오늘 처리할 일</p>
      <div className="flex flex-wrap gap-2">
        {todos.map((todo) => {
          const isTemperatureTodo = todo.id === 'todo-temperature-record';
          const baseClass =
            'inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1';
          const className = isTemperatureTodo
            ? `${baseClass} border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400 hover:bg-amber-100 focus:ring-amber-300`
            : `${baseClass} border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300 hover:bg-blue-100 focus:ring-blue-300`;
          return (
            <Link key={todo.id} href={todo.href} className={className}>
              <span
                className={`rounded px-1.5 py-0.5 font-bold tabular-nums ${
                  isTemperatureTodo ? 'bg-amber-200' : 'bg-blue-200'
                }`}
              >
                {todo.value}
              </span>
              <span>{todo.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
