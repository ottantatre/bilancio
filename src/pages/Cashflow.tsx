import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchCashflow, materializeRecurring } from '@/api/cashflow.mock';

const ORG_ID = 'mock-org';

export function CashflowPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['cashflow', ORG_ID],
    queryFn: () => fetchCashflow(ORG_ID, 90),
  });

  const { mutate: doMaterialize, isPending } = useMutation({
    mutationFn: () => materializeRecurring(ORG_ID, 90),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cashflow', ORG_ID] }),
  });

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p4 text-red-500">Error: {error.message}</div>;

  const groups = (data ?? []).reduce<Record<string, typeof data>>((aggr, datum) => {
    const key = dayjs(datum.event_date).format('YYYY-MM-DD (dddd)');
    (aggr[key] ||= []).push(datum);
    return aggr;
  }, {});

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Cashflow — 90 dni</h1>
        <button onClick={() => doMaterialize()} disabled={isPending} className="px-3 py-2 rounded bg-blue-600 text-white">
          Materializuj cykliczne
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(groups).map(([date, items]) => (
          <div key={date} className="border rounded-xl p-4">
            <div className="font-medium opacity-80 mb-2">{date}</div>
            <ul className="divide-y">
              {items?.map((e, idx) => (
                <li key={idx} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.title || e.kind}</div>
                    <div className="text-sm opacity-70">
                      {e.kind} • {e.source} • {e.status}
                    </div>
                  </div>
                  <div className={e.direction === 'IN' ? 'text-green-600' : 'text-red-600'}>
                    {e.direction === 'IN' ? '+' : '-'}
                    {e.amount.toFixed(2)} {e.currency}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
