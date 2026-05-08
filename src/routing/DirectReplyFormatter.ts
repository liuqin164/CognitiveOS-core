import type { SystemIntent } from './SystemIntentClassifier.js';
import { formatApprovalsReply } from './templates/approvals_template.js';
import { formatCapabilitiesReply } from './templates/ability_template.js';
import { formatContradictionsReply } from './templates/contradictions_template.js';
import { formatContextReply } from './templates/context_template.js';
import { formatImportanceReply } from './templates/importance_template.js';
import { formatMemoryReply } from './templates/memory_template.js';
import { formatTasksReply } from './templates/tasks_template.js';
import { formatTraceReply } from './templates/trace_template.js';
import {
  formatEnvironmentReply,
  formatFileAssetsReply,
  formatModelsReply,
  formatSelfManifestReply
} from './templates/self_manifest_template.js';

export class DirectReplyFormatter {
  format(intent: SystemIntent, data: unknown): string {
    if (data === null || data === undefined) {
      return '（暂无数据）';
    }

    switch (intent) {
      case 'system_query.tasks':
      case 'system_command.resume':
      case 'system_command.cancel_task':
        return formatTasksReply(data);
      case 'system_query.approvals':
      case 'system_command.approve':
      case 'system_command.reject':
      case 'system_confirmation.yes_no':
        return formatApprovalsReply(data);
      case 'system_query.contradictions':
        return formatContradictionsReply(data);
      case 'system_query.capabilities':
        return formatCapabilitiesReply(data);
      case 'system_query.environment':
        return formatEnvironmentReply(data);
      case 'system_query.models':
        return formatModelsReply(data);
      case 'system_query.file_assets':
        return formatFileAssetsReply(data);
      case 'system_query.self_manifest':
        return formatSelfManifestReply(data);
      case 'system_query.memory_recent':
      case 'system_query.memory_search':
        return formatMemoryReply(data);
      case 'system_query.important_memories':
      case 'system_command.mark_important':
      case 'system_command.mark_permanent':
      case 'system_command.unmark_important':
        return formatImportanceReply(data);
      case 'system_query.context':
        return formatContextReply(data);
      case 'system_query.trace':
        return formatTraceReply(data);
      case 'reasoning_required':
        return '（暂无数据）';
      default:
        return '（暂无数据）';
    }
  }
}
