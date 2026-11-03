import { ConversationRepository } from "./conversation.repository.js";
import { MAX_HISTORY_MESSAGES } from "./conversation.constants.js";
import { ChatMessage } from "../chat/interfaces/chat-message.interface.js";
import { ConversationTitleGeneratorService } from "./title-generator.service.js";

export class ConversationService {

    private readonly repository = new ConversationRepository();
    private readonly titleGenerator = new ConversationTitleGeneratorService();

    async ensureConversation(
        tenantId: string,
        conversationId?: string,
    ): Promise<string> {

        if (!conversationId) {
            return this.repository.createConversation(
                tenantId,
            );
        }

        const exists = await this.repository.conversationExists(
            tenantId,
            conversationId,
        );

        if (exists) {
            return conversationId;
        }

        return this.repository.createConversation(
            tenantId,
        );
    }

    async getConversations(
        tenantId: string,
        page: number,
        pageSize: number,
        search?: string,
    ) {

        return this.repository.listConversations(
            tenantId,
            page,
            pageSize,
            search,
        );
    }

    async getConversationById(
        tenantId: string,
        conversationId: string,
    ) {

        const conversation = await this.repository.getConversationById(
            tenantId,
            conversationId,
        );

        if (!conversation) {
            return {
                conversation: null,
                messages: [],
            };
        }

        const messages = await this.repository.getMessages(
            conversationId,
            1000,
        );

        return {
            conversation,
            messages,
        };
    }

    async getHistory(
        tenantId: string,
        conversationId: string,
    ): Promise<ChatMessage[]> {

        const conversation = await this.repository.getConversationById(
            tenantId,
            conversationId,
        );
        if (!conversation) return [];

        const messages = await this.repository.getMessages(
            conversationId,
            MAX_HISTORY_MESSAGES,
        );

        return messages.map(message => ({
            role: message.role as "user" | "assistant",
            content: message.content,
            timestamp: message.createdAt,
        }));
    }

    async addUserMessage(
        conversationId: string,
        content: string,
    ): Promise<void> {

        const nextSequence = (
            await this.repository
                .getLatestSequenceNumber(
                    conversationId,
                )
        ) + 1;

        await this.repository.addMessage(
            conversationId,
            "user",
            content,
            nextSequence,
        );
    }

    async addAssistantMessage(
        conversationId: string,
        content: string,
    ): Promise<void> {

        const nextSequence =
            (
                await this.repository
                    .getLatestSequenceNumber(
                        conversationId,
                    )
            ) + 1;

        await this.repository.addMessage(
            conversationId,
            "assistant",
            content,
            nextSequence,
        );
    }

    private generateTitle(
        question: string,
    ): string {

        return question
            .trim()
            .replace(/\?$/, "")
            .replace(/\s+/g, " ")
            .slice(0, 60);
    }

    async generateAndSaveTitle(
        tenantId: string,
        conversationId: string,
        question: string,
    ): Promise<void> {

        const title = await this.titleGenerator.generate(
            question,
        );

        await this.repository.updateTitle(
            tenantId,
            conversationId,
            title,
        );
    }

    async deleteConversation(
        tenantId: string,
        conversationId: string,
    ): Promise<void> {
        await this.repository.deleteConversation(tenantId, conversationId);
    }

    async deleteAllForTenant(tenantId: string): Promise<void> {
        await this.repository.deleteAllForTenant(tenantId);
    }

    async renameConversation(
        tenantId: string,
        conversationId: string,
        title: string,
    ): Promise<void> {
        await this.repository.renameConversation(tenantId, conversationId, title);
    }
}