import postcss from 'postcss';
export declare function tailwindCompiler(classes: string[], { prefix, darkModeDataAttribute }: {
    darkModeDataAttribute?: string | null;
    prefix: string;
}): Promise<postcss.Result<postcss.Root>>;
