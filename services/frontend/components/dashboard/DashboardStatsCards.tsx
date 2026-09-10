'use client';

// Left-column statistics tiles (Total / Ongoing / Completed / Proposed /
// Pending Approval / Approved). Verbatim markup from the old dashboard.tsx.

import type { ProjectStatistics, ApprovalStats } from "@/components/dashboard/dashboard-helpers";

interface DashboardStatsCardsProps {
  projectStats: ProjectStatistics;
  approvalStats: ApprovalStats;
}

export function DashboardStatsCards({ projectStats, approvalStats }: DashboardStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-[15px] order-1 md:order-none">
      {/* Total Projects Card */}
      <div className="bg-[#4a8cd7] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
        {/* Decorative Circle - Creates light blue gradient effect on top */}
        <div className="absolute left-[-85px] top-[-135px] w-[256px] h-[256px] rotate-[5.438deg]">
          <div className="w-full h-full rounded-full bg-[#6ba9e3] opacity-40"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-3 sm:p-[15px]">
          <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Total Projects
          </p>
          <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {projectStats.totalProjects}
          </p>
        </div>
      </div>

      {/* Ongoing Projects Card */}
      <div className="bg-[#479c39] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
        {/* Decorative Pattern - White wavy lines */}
        <div className="absolute left-[50px] top-[8px] w-[200.5px] h-[126.5px]">
          <img
            src="/assets/2b063dca51b5ca11609fc603566283ea564647cb.svg"
            alt=""
            className="block max-w-none w-full h-full"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 p-3 sm:p-[15px]">
          <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Ongoing Projects
          </p>
          <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {projectStats.ongoingProjects}
          </p>
        </div>
      </div>

      {/* Completed Projects Card */}
      <div className="bg-[#6647bf] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
        {/* Decorative Circle - Purple circle at top right */}
        <div className="absolute left-[111px] top-[-40px] w-[100px] h-[100px]">
          <img
            src="/assets/1b64fa6c63104807e4e78a514d253af1cf83e472.svg"
            alt=""
            className="block max-w-none w-full h-full"
          />
        </div>

        {/* Decorative Pattern - Bottom left pattern */}
        <div className="absolute left-[0.5px] top-[37.5px] w-[138px] h-[82.5px]">
          <img
            src="/assets/2cc8d5759ab199ac352266e7f212d8c7f1f25fcb.svg"
            alt=""
            className="block max-w-none w-full h-full"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 p-3 sm:p-[15px]">
          <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Completed Projects
          </p>
          <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {projectStats.completedProjects}
          </p>
        </div>
      </div>

      {/* Proposed Projects Card */}
      <div className="bg-[#f27944] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
        {/* Decorative Shape - Left side light shape */}
        <div className="absolute left-[-80px] top-[-55px] w-[148.992px] h-[136px]">
          <img
            src="/assets/c22bb55b4bce2667347f808cb73b615654287850.svg"
            alt=""
            className="block max-w-none w-full h-full"
          />
        </div>

        {/* Decorative Pattern - Right side pattern */}
        <div className="absolute left-[124px] top-[-33px] w-[100.186px] h-[111.296px]">
          <img
            src="/assets/c8c774b0bd6d6628bb3416cb3eb48d96f38697cd.svg"
            alt=""
            className="block max-w-none w-full h-full"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 p-3 sm:p-[15px]">
          <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Proposed Projects
          </p>
          <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {projectStats.proposedProjects}
          </p>
        </div>
      </div>

      {/* Pending Approval Card */}
      <div className="bg-[#f59e0b] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
        {/* Decorative Circle - Top Right */}
        <div className="absolute right-[-20px] top-[-20px] w-[100px] h-[100px] rounded-full bg-[#fbbf24] opacity-40"></div>
        {/* Decorative Circle - Bottom Left */}
        <div className="absolute left-[-10px] bottom-[-10px] w-[60px] h-[60px] rounded-full bg-[#fbbf24] opacity-30"></div>

        {/* Content */}
        <div className="relative z-10 p-3 sm:p-[15px]">
          <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Pending Approval
          </p>
          <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {approvalStats.pendingApproval}
          </p>
        </div>
      </div>

      {/* Approved Tasks Card */}
      <div className="bg-[#10b981] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
         {/* Decorative Square - Top Left */}
        <div className="absolute left-[10px] top-[10px] w-[40px] h-[40px] rotate-45 bg-[#34d399] opacity-30"></div>
         {/* Decorative Circle - Right */}
        <div className="absolute right-[-30px] top-[20px] w-[120px] h-[120px] rounded-full bg-[#34d399] opacity-30"></div>

        {/* Content */}
        <div className="relative z-10 p-3 sm:p-[15px]">
          <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Approved Tasks
          </p>
          <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {approvalStats.approved}
          </p>
        </div>
      </div>
    </div>
  );
}
