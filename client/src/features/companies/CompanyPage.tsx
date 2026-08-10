import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API: string = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ?? '';

export default function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['company', slug],
    queryFn: () => axios.get(`${API}/api/companies/${slug}`).then(r => r.data.data),
    enabled: !!slug,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  if (error || !data) return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center">
      <p className="text-gray-500">Company not found.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div
          className="h-32 bg-paper-sunk"
          style={data.coverImage ? { backgroundImage: `url(${data.coverImage})`, backgroundSize: 'cover' } : {}}
        />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-8">
            <div className="w-20 h-20 rounded-xl bg-white shadow border border-white flex items-center justify-center overflow-hidden">
              {data.logo ? (
                <img src={data.logo} alt={data.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-blue-600">{data.name?.[0]}</span>
              )}
            </div>
            <div className="flex-1 pb-1">
              <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
              <p className="text-gray-500 text-sm">{data.tagline}</p>
            </div>
            <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition">
              Follow
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* About */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
            <p className="text-gray-600 leading-relaxed">{data.description || 'No description provided.'}</p>
          </div>

          {/* Jobs */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Open Positions</h2>
            {data.jobs?.length > 0 ? (
              <ul className="space-y-3">
                {data.jobs.map((job: { _id: string; title: string; location: string; workType: string }) => (
                  <li key={job._id} className="flex justify-between items-center py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{job.title}</p>
                      <p className="text-sm text-gray-500">{job.location} · {job.workType}</p>
                    </div>
                    <a href={`/jobs/${job._id}`} className="text-blue-600 text-sm font-medium hover:underline">View</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm">No open positions at this time.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-3 text-sm">
            {data.industry && <div><span className="text-gray-500">Industry</span><p className="font-medium">{data.industry}</p></div>}
            {data.size && <div><span className="text-gray-500">Company size</span><p className="font-medium">{data.size}</p></div>}
            {data.founded && <div><span className="text-gray-500">Founded</span><p className="font-medium">{data.founded}</p></div>}
            {data.headquarters && <div><span className="text-gray-500">Headquarters</span><p className="font-medium">{data.headquarters}</p></div>}
            {data.website && (
              <div>
                <span className="text-gray-500">Website</span>
                <a href={data.website} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline truncate">{data.website}</a>
              </div>
            )}
          </div>

          {data.specialties?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {data.specialties.map((s: string) => (
                  <span key={s} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-sm">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
