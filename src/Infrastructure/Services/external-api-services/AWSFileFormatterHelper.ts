import { injectable } from 'inversify';

/**
 * Helper class for formatting AWS file templates with variables
 */
@injectable()
export class AWSFileFormatterHelper {
    /**
     * Formats a template string by replacing variables enclosed in {{}} with their values
     * @param template The template string containing variables in {{variable}} format
     * @param variables Object containing variable names and their values
     * @returns Formatted string with variables replaced
     */
    public formatTemplate(template: string, variables: Record<string, string>): string {
        if (!template) {
            throw new Error('Template string is required');
        }

        if (!variables || Object.keys(variables).length === 0) {
            return template;
        }

        // Find all variables in the template using regex
        const variablePattern = /{{([^{}]+)}}/g;
        const matches = template.match(variablePattern) || [];
        const uniqueVariables = [...new Set(matches)].map(match => match.slice(2, -2));

        console.log("AWSFileFormatterHelper::formatTemplate:: uniqueVariables: ", {uniqueVariables});
        console.log("AWSFileFormatterHelper::formatTemplate:: matches: ", {matches})
        // Validate that all required variables are provided
        const missingVariables = uniqueVariables.filter(variable => !(variable in variables));
        console.log("AWSFileFormatterHelper::formatTemplate:: missingVariables: ", {missingVariables});
        if (missingVariables.length > 0) {
            throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
        }

        // Replace all variables with their values
        return template.replace(variablePattern, (match, variable) => {
            const value = variables[variable];
            if (value === undefined || value === null) {
                throw new Error(`Value for variable ${variable} is undefined or null`);
            }
            const formatedTemplate = String(value);
            console.log("AWSFileFormatterHelper::formatTemplate:: formattedTemplate: ", {formatedTemplate});
            return formatedTemplate;
        });
    }

    /**
     * Creates a variables object from an email data object
     * @param data Object containing email data
     * @returns Record of variable names and their values
     */
    public createEmailVariables(data: Record<string, any>): Record<string, string> {
        const variables: Record<string, string> = {};
        
        // Process each property in the data object
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                variables[key] = String(value);
            }
        });

        // Add any additional common variables
        variables.CompanyName = variables.CompanyName;
        
        return variables;
    }

    /**
     * Validates that a template string contains valid variable syntax
     * @param template The template string to validate
     * @returns True if the template has valid syntax, throws error if invalid
     */
    public validateTemplateFormat(template: string): boolean {
        const variablePattern = /{{([^{}]+)}}/g;
        const matches = template.match(variablePattern) || [];
        
        // Check for unmatched {{ or }}
        const openBraces = (template.match(/{{/g) || []).length;
        const closeBraces = (template.match(/}}/g) || []).length;
        
        if (openBraces !== closeBraces) {
            throw new Error('Template has unmatched braces');
        }

        // Check for empty variable names
        const emptyVariables = matches.some(match => match === '{{}}');
        if (emptyVariables) {
            throw new Error('Template contains empty variable placeholders');
        }

        // Check for nested variables
        const nestedVariables = matches.some(match => match.match(/{{.*{{.*}}.*}}/));
        if (nestedVariables) {
            throw new Error('Template contains nested variable placeholders');
        }

        return true;
    }
}
