/**
 * Session Report
 *
 * Page for the AIfacilitator application.
 */

import React from 'react';
import SessionReportView from '@/components/session/SessionReportView';
import PageHead from '@/components/PageHead';

const SessionReport = () => {
  return (
    <>
      <PageHead title="Session Report" description="View your workshop session report" />
      <SessionReportView />
    </>
  );
};

export default SessionReport;
