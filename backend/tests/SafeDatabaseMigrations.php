<?php

namespace Tests;

use Illuminate\Database\Connection;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Support\Facades\DB;

/**
 * Drop-in replacement for DatabaseMigrations that avoids calling
 * broken down() methods during teardown.
 *
 * Instead of migrate:fresh (which calls down() on all migrations),
 * we drop all tables via raw SQL and re-run migrate.
 */
trait SafeDatabaseMigrations
{
    /**
     * Run migrations before each test.
     */
    public function runDatabaseMigrations(): void
    {
        $this->beforeRefreshingDatabase();
        $this->refreshTestDatabase();
        $this->afterRefreshingDatabase();

        // No beforeApplicationDestroyed — we don't call migrate:rollback
        // Tables are dropped at the START of the next test via refreshTestDatabase()
    }

    /**
     * Drop all tables and re-run migrations without calling down().
     */
    protected function refreshTestDatabase(): void
    {
        $connection = DB::connection();
        $this->dropAllTables($connection);

        $this->artisan('migrate');

        $this->app[\Illuminate\Contracts\Console\Kernel::class]->setArtisan(null);
    }

    protected function beforeRefreshingDatabase(): void {}
    protected function afterRefreshingDatabase(): void {}

    /**
     * Drop all tables, bypassing migration down() methods.
     */
    private function dropAllTables(Connection $connection): void
    {
        $driver = $connection->getDriverName();

        if ($driver === 'sqlite') {
            $tables = $connection->select(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            );
            foreach ($tables as $table) {
                $connection->statement("DROP TABLE IF EXISTS \"{$table->name}\"");
            }
        } else {
            $schema = $connection->getSchemaBuilder();
            foreach ($schema->getTableListing() as $table) {
                $schema->dropIfExists($table);
            }
        }
    }
}
