export interface CycleTLSRequestOptions {
    headers?: {
        [key: string]: any;
    };
    cookies?: {
        [key: string]: any;
    };
    body?: string;
    ja3?: string;
    userAgent?: string;
    proxy?: string;
    timeout?: number;
    disableRedirect?: boolean;
}
export interface CycleTLSResponse {
    status: number;
    body: string;
    headers: {
        [key: string]: any;
    };
}
export interface CycleTLSClient {
    (url: string, options: CycleTLSRequestOptions, method?: "head" | "get" | "post" | "put" | "delete" | "trace" | "options" | "connect" | "patch"): Promise<CycleTLSResponse>;
    head(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;
    get(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;
    post(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;
    put(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;
    delete(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;
    trace(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;
    options(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;
    connect(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;
    patch(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;
    exit(): Promise<undefined>;
}
declare const initCycleTLS: (initOptions?: {
    port?: number;
    debug?: boolean;
}) => Promise<CycleTLSClient>;
export default initCycleTLS;
