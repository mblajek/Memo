<?php

namespace App\Http\Permissions;

readonly class PermissionDescribe implements \Stringable
{
    private string $description;

    /**
     * @param Permission|Permission[] ...$params
     */
    public function __construct(Permission|array ...$params)
    {
        $result = [];
        $transformedParams = [];
        foreach ($params as $param) {
            if ($param instanceof Permission) {
                $transformedParams[] = [$param];
            } elseif (count($param)) {
                $transformedParams[] = $param;
            }
        }
        $countParams = count($transformedParams);
        /** @var Permission|Permission[] $group */
        foreach ($transformedParams as $group) {
            $singleResult = implode(' OR ', array_map(fn(Permission $permission) => $permission->name, $group));
            $result[] = ($countParams !== 1 && count($group) !== 1) ? "($singleResult)" : $singleResult;
        }

        $this->description = 'Permissions: ' . (implode(' AND ', $result) ?: Permission::any->name);
    }

    public function __toString(): string
    {
        return $this->description;
    }
}
