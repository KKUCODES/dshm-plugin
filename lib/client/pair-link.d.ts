/** 转换电脑已生成的配对材料；不创建第二个 key，也不请求二维码服务。 */
export declare function appPairLink(link: string): string;
export declare function pairQr(link: string): {
    size: number;
    path: string;
};
