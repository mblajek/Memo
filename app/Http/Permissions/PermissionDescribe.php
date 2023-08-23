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

        /** @var Permission|Permission[] $group */
        foreach ($params as $group) {
            if (is_array($group) && count($group) === 1) {
                $group = current($group);
            }

            if ($group instanceof Permission) {
                $result[] = $group->name;
                continue;
            }

            $result[] = '(' . implode(' OR ', array_map(fn($permission) => $permission->name, $group)) . ')';
        }

        $this->description = 'Permissions: ' . implode(' AND ',  $result);
    }

    public function __toString(): string
    {
        return $this->description;
    }
}
