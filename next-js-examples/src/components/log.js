const log = {
    messageHistory: [],
    maxEntries: 200,  // Configurable max entries
    
    addMessage: function(message) {
        this.messageHistory.push(message);
    },

    getMessages: function(limit = this.maxEntries) {
        // Return only the most recent 'limit' messages
        return this.messageHistory.slice(-limit);
    },

    getMessagesByRole: function(roles, limit = this.maxEntries) {
        if (!Array.isArray(roles)) {
            roles = [roles]; // Convert single role to array
        }
        return this.messageHistory
            .filter(message => roles.includes(message.role))
            .slice(-limit);
    },

    // Optional: add a method to clear old messages if needed
    cleanup: function() {
        if (this.messageHistory.length > this.maxEntries * 2) {
            this.messageHistory = this.messageHistory.slice(-this.maxEntries);
        }
    }
};

export { log };



