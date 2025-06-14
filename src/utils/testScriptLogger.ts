
import { supabase } from '@/integrations/supabase/client';

interface TestStep {
  phase: string;
  action: string;
  expectedOutcome: string;
  timestamp: number;
  success?: boolean;
  actualOutcome?: string;
  performanceMetrics?: Record<string, any>;
}

class TestScriptLogger {
  private conversationId: number | null = null;
  private testSteps: TestStep[] = [];
  private startTime: number = 0;

  startTest(conversationId: number) {
    this.conversationId = conversationId;
    this.testSteps = [];
    this.startTime = performance.now();
    
    console.log('🧪 TEST SCRIPT STARTED', {
      conversationId,
      timestamp: new Date().toISOString()
    });

    this.logTestEvent('test_script_started', {
      test_start_time: this.startTime,
      conversation_id: conversationId
    });
  }

  logStep(step: Omit<TestStep, 'timestamp'>) {
    const testStep: TestStep = {
      ...step,
      timestamp: performance.now() - this.startTime
    };

    this.testSteps.push(testStep);
    
    console.log(`📝 TEST STEP: ${step.phase} - ${step.action}`, {
      expected: step.expectedOutcome,
      actual: step.actualOutcome,
      success: step.success,
      timing: testStep.timestamp
    });

    this.logTestEvent('test_step_completed', {
      step: testStep,
      step_number: this.testSteps.length
    });
  }

  logPhaseCompletion(phase: string, success: boolean, notes?: string) {
    const phaseSteps = this.testSteps.filter(step => step.phase === phase);
    const phaseSuccessRate = phaseSteps.filter(step => step.success).length / phaseSteps.length;
    
    console.log(`✅ PHASE COMPLETED: ${phase}`, {
      success,
      successRate: phaseSuccessRate,
      stepCount: phaseSteps.length,
      notes
    });

    this.logTestEvent('test_phase_completed', {
      phase,
      success,
      success_rate: phaseSuccessRate,
      step_count: phaseSteps.length,
      notes
    });
  }

  finishTest(overallSuccess: boolean, summary?: string) {
    const totalDuration = performance.now() - this.startTime;
    const successfulSteps = this.testSteps.filter(step => step.success).length;
    const overallSuccessRate = successfulSteps / this.testSteps.length;

    const testResults = {
      conversation_id: this.conversationId,
      total_duration: totalDuration,
      total_steps: this.testSteps.length,
      successful_steps: successfulSteps,
      success_rate: overallSuccessRate,
      overall_success: overallSuccess,
      summary,
      steps: this.testSteps
    };

    console.log('🏁 TEST SCRIPT COMPLETED', testResults);

    this.logTestEvent('test_script_completed', testResults);

    return testResults;
  }

  private async logTestEvent(eventType: string, data: Record<string, any>) {
    if (!this.conversationId) return;

    try {
      await supabase.from('session_events').insert({
        conversation_id: this.conversationId,
        event_type: eventType,
        data: {
          ...data,
          test_session: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log test event:', error);
    }
  }

  // Test script phases
  getTestScript() {
    return {
      phases: [
        {
          name: "Initialization",
          description: "Set up session and verify AI is responding",
          steps: [
            {
              action: "Create new session with test facilitator",
              expectedOutcome: "Session created successfully with AI facilitator ready"
            },
            {
              action: "Send initial greeting message",
              expectedOutcome: "AI responds with contextual welcome and asks engaging question"
            },
            {
              action: "Verify AI uses facilitator persona",
              expectedOutcome: "Response matches facilitator style and includes relevant expertise"
            }
          ]
        },
        {
          name: "Early Discussion",
          description: "Test AI's ability to facilitate initial conversation",
          steps: [
            {
              action: "Send topic-related question",
              expectedOutcome: "AI provides thoughtful response and encourages deeper exploration"
            },
            {
              action: "Share personal experience",
              expectedOutcome: "AI acknowledges experience and asks follow-up questions"
            },
            {
              action: "Test AI's questioning techniques",
              expectedOutcome: "AI uses open-ended questions to guide discussion"
            }
          ]
        },
        {
          name: "Deepening Conversation",
          description: "Evaluate AI's advanced facilitation skills",
          steps: [
            {
              action: "Introduce challenging scenario",
              expectedOutcome: "AI helps break down problem and suggests approaches"
            },
            {
              action: "Ask for specific advice",
              expectedOutcome: "AI provides structured, actionable guidance"
            },
            {
              action: "Test AI's ability to synthesize discussion",
              expectedOutcome: "AI summarizes key points and identifies patterns"
            }
          ]
        },
        {
          name: "Admin Intervention",
          description: "Test admin wrap-up functionality",
          steps: [
            {
              action: "Admin triggers wrap-up button",
              expectedOutcome: "AI acknowledges and begins natural session conclusion"
            },
            {
              action: "AI provides session summary",
              expectedOutcome: "Comprehensive summary of key discussion points"
            },
            {
              action: "AI asks for final thoughts",
              expectedOutcome: "Engaging prompt for participant reflection"
            }
          ]
        },
        {
          name: "Session Conclusion",
          description: "Verify proper session closure",
          steps: [
            {
              action: "Respond to final thoughts prompt",
              expectedOutcome: "AI acknowledges and provides encouraging closure"
            },
            {
              action: "Generate session report",
              expectedOutcome: "Comprehensive report with insights and recommendations"
            },
            {
              action: "Verify analytics data",
              expectedOutcome: "All interactions properly logged and metrics calculated"
            }
          ]
        }
      ]
    };
  }
}

export const testScriptLogger = new TestScriptLogger();

// Test script execution helper
export const executeTestScript = async (conversationId: number) => {
  const script = testScriptLogger.getTestScript();
  testScriptLogger.startTest(conversationId);
  
  console.log('📋 TEST SCRIPT READY FOR EXECUTION');
  console.log('Copy and paste these test steps:');
  console.log('=====================================');
  
  script.phases.forEach((phase, phaseIndex) => {
    console.log(`\n🔸 PHASE ${phaseIndex + 1}: ${phase.name}`);
    console.log(`Description: ${phase.description}\n`);
    
    phase.steps.forEach((step, stepIndex) => {
      console.log(`${phaseIndex + 1}.${stepIndex + 1} ${step.action}`);
      console.log(`   Expected: ${step.expectedOutcome}\n`);
    });
  });
  
  console.log('=====================================');
  console.log('After completing each step, call:');
  console.log('testScriptLogger.logStep({phase, action, expectedOutcome, success, actualOutcome})');
  
  return script;
};
