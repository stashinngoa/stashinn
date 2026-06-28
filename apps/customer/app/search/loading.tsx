export default function LoadingSearch() {
  return (
    <div className="h-screen flex flex-col font-inter bg-gray-50 overflow-hidden animate-pulse">
      {/* Header Skeleton */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 sticky top-0 z-50">
        <div className="w-24 h-6 bg-gray-200 rounded-md mr-8"></div>
        <div className="flex-1 max-w-4xl hidden md:flex h-10 bg-gray-100 rounded-full border border-gray-200"></div>
        <div className="ml-auto flex items-center space-x-6">
          <div className="w-24 h-4 bg-gray-200 rounded-md hidden lg:block"></div>
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        </div>
      </header>

      {/* Split View Skeleton */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-50">
        {/* Left Side: List Skeleton */}
        <div className="w-full lg:w-[600px] h-full overflow-y-auto px-4 py-6 shadow-inner space-y-6">
          <div className="w-48 h-6 bg-gray-200 rounded mb-4"></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-48 flex flex-col sm:flex-row p-4">
              <div className="sm:w-40 h-40 bg-gray-100 rounded-xl"></div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="w-3/4 h-5 bg-gray-200 rounded mb-2"></div>
                  <div className="w-1/2 h-4 bg-gray-100 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="w-16 h-6 bg-gray-100 rounded"></div>
                    <div className="w-16 h-6 bg-gray-100 rounded"></div>
                  </div>
                </div>
                <div className="flex justify-between items-end mt-4">
                  <div className="w-20 h-6 bg-gray-200 rounded"></div>
                  <div className="w-24 h-10 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Right Side: Map Skeleton */}
        <div className="flex-1 h-[350px] lg:h-full relative bg-gray-50 p-4 lg:p-6 lg:pl-0">
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-gray-200"></div>
        </div>
      </div>
    </div>
  );
}
