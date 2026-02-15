/**
 * Workflow page showing the automation pipeline.
 */
import { FileText, Brain, Eye, Send, CheckCircle } from 'lucide-react';

export const WorkflowPage = () => {
  const steps = [
    {
      number: 1,
      title: 'Read Google Sheet',
      description: 'Parse workstreams and milestones from the tracking spreadsheet',
      icon: FileText,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      number: 2,
      title: 'Fetch Notes Documents',
      description: 'Extract linked Google Docs content for each track',
      icon: FileText,
      color: 'bg-green-100 text-green-600',
    },
    {
      number: 3,
      title: 'AI Analysis',
      description: 'Claude AI generates structured updates from documentation',
      icon: Brain,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      number: 4,
      title: 'Human Review',
      description: 'Review and edit AI-generated content before posting',
      icon: Eye,
      color: 'bg-orange-100 text-orange-600',
    },
    {
      number: 5,
      title: 'Post to Jira + Sheet',
      description: 'Update Jira tickets and write summaries back to spreadsheet',
      icon: Send,
      color: 'bg-red-100 text-red-600',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Automation Workflow</h1>
        <p className="text-gray-600 mt-1">
          Visual representation of the AI-powered update pipeline
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="space-y-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.number} className="relative">
                <div className="flex items-start gap-6">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-14 h-14 rounded-full ${step.color} flex items-center justify-center`}>
                    <Icon className="w-7 h-7" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-2">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold">
                        {step.number}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-gray-600 ml-11">{step.description}</p>
                  </div>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="absolute left-7 top-14 bottom-0 w-0.5 bg-gray-200 -mb-8" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Key Benefits
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Automated context extraction from documents</li>
            <li>• Consistent update format across all milestones</li>
            <li>• Reduced manual effort by 80%+</li>
            <li>• Human oversight for quality control</li>
          </ul>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Capabilities
          </h3>
          <ul className="space-y-2 text-sm text-purple-800">
            <li>• Extracts relevant info per milestone</li>
            <li>• Identifies recent changes with dates</li>
            <li>• Summarizes progress and next steps</li>
            <li>• Generates leadership-ready summaries</li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Use</h3>
        <ol className="space-y-3 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
              1
            </span>
            <span>
              <strong>Dashboard:</strong> Click "Run Updates Now" to process all milestones, or click "Preview" on individual rows
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
              2
            </span>
            <span>
              <strong>Review:</strong> Edit the AI-generated content in the preview modal if needed
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
              3
            </span>
            <span>
              <strong>Post:</strong> Click "Post to Jira & Sheet" to publish the update to both systems
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
              4
            </span>
            <span>
              <strong>Verify:</strong> Check Jira ticket and Google Sheet to confirm updates were posted correctly
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
};
