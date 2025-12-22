declare module 'cloudinary' {
    namespace v2 {
        interface ConfigOptions {
            cloud_name: string;
            api_key: string;
            api_secret: string;
            secure?: boolean;
        }

        interface UploadApiOptions {
            public_id?: string;
            folder?: string;
            resource_type?: string;
            tags?: string[];
            use_filename?: boolean;
            unique_filename?: boolean;
            transformation?: any;
            metadata?: any;
            access_control?: any[];
            fetch_format?: string;
            [key: string]: any;
        }

        interface DestroyApiOptions {
            resource_type?: string;
            type?: string;
            invalidate?: boolean;
        }

        interface ResourceApiOptions {
            resource_type?: string;
            type?: string;
            prefix?: string;
            max_results?: number;
            next_cursor?: string;
        }

        interface UrlOptions {
            secure?: boolean;
            transformation?: any;
            [key: string]: any;
        }

        interface UploadApiResponse {
            public_id: string;
            url: string;
            secure_url: string;
            original_filename?: string;
            format: string;
            bytes: number;
            resource_type: string;
            created_at: string;
            width?: number;
            height?: number;
            tags?: string[];
            folder?: string;
            asset_id?: string;
            version?: number;
            signature?: string;
            metadata?: any;
            [key: string]: any;
        }

        interface DestroyApiResponse {
            result: string;
            [key: string]: any;
        }

        interface ResourceApiResponse {
            public_id: string;
            url: string;
            secure_url: string;
            format: string;
            bytes: number;
            resource_type: string;
            created_at: string;
            width?: number;
            height?: number;
            tags?: string[];
            folder?: string;
            version?: number;
            access_mode?: string;
            [key: string]: any;
        }

        namespace uploader {
            function upload(file: string | Buffer, options?: UploadApiOptions): Promise<UploadApiResponse>;
            function destroy(publicId: string, options?: DestroyApiOptions): Promise<DestroyApiResponse>;
        }

        namespace api {
            function resource(publicId: string, options?: ResourceApiOptions): Promise<ResourceApiResponse>;
            function resources(options?: ResourceApiOptions): Promise<{ resources: ResourceApiResponse[] }>;
        }

        function config(options: ConfigOptions): void;
        function url(publicId: string, options?: UrlOptions): string;
    }

    export = { v2 };
}
