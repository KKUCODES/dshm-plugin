/** HEAD 同样经过原模块注册表；只返回当前资源的内容指纹，不将缓存当作访问许可。 */
export declare class ResourceValidator {
    private readonly hashes;
    fetch(request: Request, revision: string, fetchBundle: (request: Request) => Promise<Response>): Promise<Response>;
}
