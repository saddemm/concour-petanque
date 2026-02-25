#!/usr/bin/env python3
"""
Script de débogage détaillé pour analyser les problèmes de tournoi
"""

import json
import subprocess
import sys

BASE_URL = 'http://localhost:3000'

def api_call(method, endpoint, data=None):
    cmd = ['curl', '-s']
    if method != 'GET':
        cmd.extend(['-X', method])
    cmd.append(f'{BASE_URL}{endpoint}')
    cmd.extend(['-H', 'Content-Type: application/json'])
    if data:
        cmd.extend(['-d', json.dumps(data)])
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(result.stdout)
    except:
        return {'error': 'Parse error', 'raw': result.stdout[:500]}

def debug_tournament(num_teams):
    """Analyse détaillée d'un tournoi"""
    print(f"\n{'='*70}")
    print(f"DEBUG TOURNOI AVEC {num_teams} ÉQUIPES")
    print(f"{'='*70}")

    # 1. Créer le concours
    contest_data = {
        'name': f'Debug Test {num_teams} équipes',
        'teamType': 'DOUBLETTE',
        'gameMode': 'MONTE'
    }
    result = api_call('POST', '/api/contests', contest_data)
    if 'error' in result:
        print(f"❌ Erreur création: {result}")
        return

    contest_id = result['id']
    print(f"✅ Concours créé: {contest_id[:8]}...")

    # 2. Créer les équipes
    for i in range(1, num_teams + 1):
        players = [{'name': f'Joueur{i}{chr(65+j)}', 'order': j+1} for j in range(2)]
        api_call('POST', f'/api/contests/{contest_id}/teams', {'players': players})

    print(f"✅ {num_teams} équipes créées")

    # 3. Générer le tirage
    draw_result = api_call('POST', f'/api/contests/{contest_id}/draw')
    print(f"\n📊 RÉSULTAT DU TIRAGE:")
    print(f"   Tour 1: {draw_result.get('tour1Matches', '?')} matchs")
    print(f"   Tour 2 Winners: {draw_result.get('tour2WinnersMatches', '?')} matchs")
    print(f"   Tour 2 Losers: {draw_result.get('tour2LosersMatches', '?')} matchs")
    print(f"   Estimé Bracket A: {draw_result.get('estimatedQualifiedA', '?')} équipes")
    print(f"   Estimé Bracket B: {draw_result.get('estimatedQualifiedB', '?')} équipes")

    # 4. Analyser la structure des brackets
    contest = api_call('GET', f'/api/contests/{contest_id}')

    print(f"\n📐 STRUCTURE DES BRACKETS:")
    for bracket in contest.get('brackets', []):
        print(f"\n   BRACKET {bracket['type']}:")
        total_matches = 0
        for rd in bracket.get('rounds', []):
            match_count = len(rd.get('matches', []))
            total_matches += match_count
            slots_filled = sum(1 for m in rd.get('matches', [])
                             if m.get('homeTeamId') or m.get('awayTeamId'))
            print(f"     {rd['roundName']} (Tour {rd['roundNumber']}): {match_count} matchs, {slots_filled} équipes placées")
        print(f"     TOTAL: {total_matches} matchs")

    # 5. Jouer tous les matchs de qualification
    qual_matches_played = 0
    for iteration in range(100):
        contest = api_call('GET', f'/api/contests/{contest_id}')
        played = 0

        for rd in contest.get('qualificationRounds', []):
            for m in rd.get('matches', []):
                if m['status'] != 'FINISHED' and not m.get('isBye'):
                    home = m.get('homeTeam')
                    away = m.get('awayTeam')
                    if home and away:
                        result = api_call('PATCH', f'/api/contests/{contest_id}/qualification-matches/{m["id"]}',
                                         {'winnerTeamId': home['id']})
                        if 'error' not in result:
                            played += 1
                            qual_matches_played += 1

        if played == 0:
            break

    print(f"\n🎮 {qual_matches_played} matchs de qualification joués")

    # 6. Analyser l'état après qualification
    contest = api_call('GET', f'/api/contests/{contest_id}')

    print(f"\n📊 ÉTAT DES BRACKETS APRÈS QUALIFICATION:")
    for bracket in contest.get('brackets', []):
        print(f"\n   BRACKET {bracket['type']}:")
        for rd in bracket.get('rounds', []):
            for m in rd.get('matches', []):
                home = m.get('homeTeam')
                away = m.get('awayTeam')
                home_num = f"#{home['teamNumber']}" if home else "VIDE"
                away_num = f"#{away['teamNumber']}" if away else "VIDE"
                status = m['status']
                is_bye = "BYE" if m.get('isBye') else ""
                print(f"     {rd['roundName']} Match {m['matchNumber']}: {home_num} vs {away_num} [{status}] {is_bye}")

    # 7. Jouer les matchs de brackets
    bracket_matches_played = 0
    for iteration in range(50):
        contest = api_call('GET', f'/api/contests/{contest_id}')
        played = 0

        for bracket in contest.get('brackets', []):
            for rd in bracket.get('rounds', []):
                for m in rd.get('matches', []):
                    if m.get('isBye') or m['status'] == 'FINISHED':
                        continue

                    home = m.get('homeTeam')
                    away = m.get('awayTeam')

                    if home and away:
                        result = api_call('PATCH', f'/api/contests/{contest_id}/bracket-matches/{m["id"]}',
                                         {'winnerTeamId': home['id']})
                        if 'error' not in result:
                            played += 1
                            bracket_matches_played += 1

        if played == 0:
            break

    print(f"\n🎮 {bracket_matches_played} matchs de brackets joués")

    # 8. Résultat final
    contest = api_call('GET', f'/api/contests/{contest_id}')

    print(f"\n🏆 ÉTAT FINAL:")
    for bracket in contest.get('brackets', []):
        print(f"\n   BRACKET {bracket['type']}:")
        finale = None
        for rd in bracket.get('rounds', []):
            if 'Finale' in rd.get('roundName', ''):
                if rd.get('matches'):
                    finale = rd['matches'][0]
                    break

        if finale:
            home = finale.get('homeTeam')
            away = finale.get('awayTeam')
            winner = finale.get('winnerTeam')
            home_num = f"#{home['teamNumber']}" if home else "VIDE"
            away_num = f"#{away['teamNumber']}" if away else "VIDE"
            winner_num = f"#{winner['teamNumber']}" if winner else "?"
            print(f"     Finale: {home_num} vs {away_num} → Gagnant: {winner_num}")
            print(f"     Status: {finale['status']}, isBye: {finale.get('isBye')}")
        else:
            print(f"     ❌ PAS DE FINALE TROUVÉE!")

    # Nettoyer
    api_call('DELETE', f'/api/contests/{contest_id}')
    print(f"\n🗑️  Concours supprimé")

if __name__ == '__main__':
    num = int(sys.argv[1]) if len(sys.argv) > 1 else 49
    debug_tournament(num)
