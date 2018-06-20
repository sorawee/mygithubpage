arity = (function() {
    function EQ(n) {
        return {
            error: `exactly ${n}`,
            pred: t => t == n
        };
    }

    function GT(n) {
        return {
            error: `greater than or equal to ${n}`,
            pred: t => t >= n
        };
    }

    function LE(n) {
        return {
            error: `less than or equal to ${n}`,
            pred: t => t <= n
        };
    }

    return {
        EQ: EQ,
        GT: GT,
        LE: LE,
    };
})();
