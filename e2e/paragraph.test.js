// tests/e2e/paragraph.spec.js
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    console.log("Page loaded");
    await page.waitForFunction(() => window.__codex__ !== undefined);
    console.log("Codex is ready");
});


test.describe('Paragraph - Basic typing', () => {
    
    test('finding editor', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await expect(editor).toBeVisible();
    });
    
    test('typing creates text in first block', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Hello world', { delay: 10 });
        
        const codex = await page.evaluate(() => window.__codex__());
        const paragraph = codex.children[0];
        const text = paragraph.children[0];
        
        expect(text.text).toBe('Hello world');

    });
    
    test('coordinates update correctly while typing', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Test', { delay: 10 });

        const codex = await page.evaluate(() => window.__codex__());
        const selection = await page.evaluate(() => window.__selection__());
        
        expect(selection).toEqual({ start: 4, end: 4 });
    });
    
    test('typing in middle updates coordinates', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('HelloWorld', { delay: 10 });
        
        // Place le curseur entre Hello et World (position 5)
        await page.keyboard.press('Home', { delay: 10 });
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('ArrowRight', { delay: 10 });
        }
        
        await page.keyboard.type(' ', { delay: 10 }); // Tape un espace
        
        const selection = await page.evaluate(() => window.__selection__());
        console.log(selection);
        expect(selection).toEqual({ start: 6, end: 6 });
        
    });
    
});

test.describe('Paragraph - Line breaks', () => {
    
    test('Enter creates a new Paragraph block', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('First line', { delay: 10 });
        await page.keyboard.press('Enter', { delay: 10 });
        await page.keyboard.type('Second line', { delay: 10 });
        
        // Vérifie le DOM
        await expect(editor).toContainText('First line');
        await expect(editor).toContainText('Second line');
        
        // Vérifie l'état interne
        const codex = await page.evaluate(() => window.__codex__());
        
        const blockCount = codex.children.length;
        expect(blockCount).toBe(2);
        
        const texts = codex.children.map(b => b.children[0].text);
        
        expect(texts).toEqual(['First line', 'Second line']);
    });
    
    test('Shift+Enter creates soft break (not new block)', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('First line', { delay: 10 });
        await page.keyboard.press('Shift+Enter', { delay: 10 });
        await page.keyboard.type('Second line', { delay: 10 });
        
        const codex = await page.evaluate(() => window.__codex__());

        // Vérifie qu'il n'y a toujours qu'un seul bloc
        const blockCount = codex.children.length;
        expect(blockCount).toBe(1);
        
        // Vérifie que le texte contient bien les deux lignes
        const text = codex.children[0].text
        expect(text).toContain('First line');
        expect(text).toContain('Second line');
    });
    
    test('multiple Shift+Enter in a row', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Line 1', { delay: 10 });
        await page.keyboard.press('Shift+Enter', { delay: 10 });
        await page.keyboard.press('Shift+Enter', { delay: 10 });
        await page.keyboard.type('Line 2', { delay: 10 });

        const codex = await page.evaluate(() => window.__codex__());
        
        const blockCount = codex.children.length;
        expect(blockCount).toBe(1);
        
        // Devrait avoir 2 <br> dans le DOM
        const linebreakCount = codex.children[0].children.filter(c => c.type === 'linebreak').length;
        expect(linebreakCount).toBe(2);
    });
    
});

test.describe('Paragraph - Deletion', () => {
    
    test('Backspace deletes characters', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Hello', { delay: 10 });
        await page.keyboard.press('Backspace', {delay: 10});
        await page.keyboard.press('Backspace', {delay: 10});
        
        await expect(editor).toContainText('Hel');
        
        const coords = await page.evaluate(() => window.__selection__());
        expect(coords.end).toBe(3);
    });
    
    test('Backspace at start of second block merges blocks', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('First', { delay: 10 });
        await page.keyboard.press('Enter', { delay: 10 });
        await page.keyboard.type('Second', { delay: 10 });
        
        // Place le curseur au début de "Second"
        await page.keyboard.press('Home', { delay: 10 });
        await page.keyboard.press('Backspace', { delay: 10 });

        const codex = await page.evaluate(() => window.__codex__());
        
        // Les deux blocs devraient être fusionnés
        const blockCount = codex.children.length;
        expect(blockCount).toBe(1);
        
        const text = codex.children[0].text;
        expect(text).toBe('FirstSecond');
    });
    
    test('Delete key removes character ahead', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Hello', { delay: 10 });
        await page.keyboard.press('Home', { delay: 10 }); // Retour au début
        await page.keyboard.press('Delete', { delay: 10 }); // Supprime 'H'
        
        await expect(editor).toContainText('ello');
        
        const coords = await page.evaluate(() => window.__selection__());
        expect(coords.end).toBe(0);
    });
    
});

test.describe('Paragraph - Navigation', () => {
    
    test('Arrow keys move cursor', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Hello', { delay: 10 });
        
        // Curseur à la fin (position 5)
        let selection = await page.evaluate(() => window.__selection__());
        expect(selection.end).toBe(5);
        
        // Flèche gauche × 2
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        
        selection = await page.evaluate(() => window.__selection__());
        expect(selection.end).toBe(3);
    });
    
    test('Home/End keys', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Hello world', { delay: 10 });
        
        await page.keyboard.press('Home', { delay: 10 });
        let offset = await page.evaluate(() => window.__selection__().start);
        expect(offset).toBe(0);
        
        await page.keyboard.press('End', { delay: 10 });
        offset = await page.evaluate(() => window.__selection__().end);
        expect(offset).toBe(11);
    });
    
});

test.describe('Paragraph - Empty states', () => {
    
    test('empty editor has one empty block', async ({ page }) => {

        const codex = await page.evaluate(() => window.__codex__());

        const blockCount = codex.children.length;
        expect(blockCount).toBe(1);
        
        const text = codex.children[0].text;
        expect(text).toBe('');
    });
    
    test('deleting all text leaves empty block', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Test', { delay: 10 });
        
        // Sélectionne tout et supprime
        await page.keyboard.press('Control+A', { delay: 10 });
        await page.keyboard.press('Backspace', { delay: 10 });
        
        const codex = await page.evaluate(() => window.__codex__());

        const blockCount = codex.children.length;
        expect(blockCount).toBe(1);
        
        const text = codex.children[0].text;
        expect(text).toBe('');
    });
    
});