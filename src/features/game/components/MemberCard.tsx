export function MemberCard() {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl shadow-md p-4 max-w-sm mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg bg-gray-800 dark:bg-gray-700 text-white flex items-center justify-center text-lg font-bold">
          DB
        </div>
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">David Becane</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Champion 2026</div>
          <div className="text-xs text-gray-400">Membre depuis : Avril 2026</div>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Classement :</div>
          <div className="flex gap-6">
            {(['1er', '2em', '3em', '4em'] as const).map(label => (
              <div key={label} className="flex flex-col items-center text-xs text-gray-600 dark:text-gray-300">
                <span className="font-semibold">{label}</span>
                <span>0</span>
              </div>
            ))}
          </div>
        </div>
        <img src="/logoBC-sansTexte.png" className="w-12 h-12 object-contain opacity-80" alt="logo" />
      </div>
    </div>
  );
}
